import {childProcess} from '../util/util-functions'
import {spawn} from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import {GeneralError} from './../error'

export class GitOperation {
  settings: any

  tmpCredStoreFile: string

  constructor(settings: any) {
    this.settings = settings
    this.tmpCredStoreFile = path.resolve(require('os').tmpdir(), `.git-credentials-${process.pid}`)
  }
  // Get Merge Base

  run(args: string[]) {
    return new Promise((resolve, reject) => {
      const child = spawn('git', args, {cwd: this.settings.dir})
      let stdout = ''
      let stderr = ''
      child.stderr.on('data', data => {
        stderr += data
      })
      child.stdout.on('data', data => {
        stdout += data
      })
      child.on('exit', exitCode => {
        if (exitCode === 0) {
          resolve({stdout, stderr, exitCode})
        } else {
          reject(
            new GeneralError({stdout, stderr, exitCode, cwd: this.settings.dir}.toString())
          )
        }
      })
    })
  }

  // /**
  //    * Set GIT credentials to be used by any git command tht needs remote access (e.g.: fetch)
  //    * @param {*} workDir
  //    * @param {*} remoteUrl
  //    * @param {*} cred
  //    * @todo https://alanedwardes.com/blog/posts/git-username-password-environment-variables/
  //    */
  _setupCredentials(workDir: string, remoteUrl: string, cred: any) {
    // git config --global credential.helper 'store --file ~/.git-credentials'
    // git credential-store --file ~/.git-credentials store < .gitcredentials
    // result: https://fakeUsername:fakePass@apps.nrs.gov.bc.ca
    const gitCredentialHelper = `store --file=${this.tmpCredStoreFile}`
    return (
      Promise.resolve(true)
      // Check if 'credential.helper' has been set
      .then(() => {
        return childProcess('git', ['config', '--local', 'credential.helper'], {cwd: workDir})
      })
      // if 'credential.helper' has NOT been set, it wil exit with code 1
      .catch(error => {
        // anything other than exit 1 is an unexpected error
        if (error.data.exitCode !== 1) {
          return Promise.reject(error)
        }
        return Promise.resolve(true)
        .then(() => {
          const host = new URL(remoteUrl).host
          fs.writeFileSync(
            this.tmpCredStoreFile,
            `https://${cred.username}:${cred.password}@${host}\n`,
            {encoding: 'utf8'}
          )
        })
        .then(() => {
          return childProcess(
            'git',
            ['config', '--local', 'credential.helper', gitCredentialHelper],
            {cwd: workDir}
          )
        })
        .then(() => {
          // register a exit hook to delete the temporary file
          process.once('exit', () => {
            if (fs.existsSync(this.tmpCredStoreFile)) {
              // eslint-disable-next-line no-console
              console.log(`Deleting ${this.tmpCredStoreFile}`)
              fs.unlinkSync(this.tmpCredStoreFile)
            }
          })
        })
      })
    )
  } // _setupGitGlobalCredential

  clear() {
    if (fs.existsSync(this.tmpCredStoreFile)) {
      // eslint-disable-next-line no-console
      console.log(`Deleting ${this.tmpCredStoreFile}`)
      fs.unlinkSync(this.tmpCredStoreFile)
    }
  }

  getMergeBase(changeBranch: string, changeTarget: string) {
    return this.run(['merge-base', `remotes/origin/${changeBranch}`, `remotes/origin/${changeTarget}`]).then(
      (output: any) => {
        return output.stdout.split('\n')[0]
      }
    )
  }

  // Get latest Commit
  getLatestCommitOnTarget(changeTarget: string) {
    return this.run(['rev-parse', `remotes/origin/${changeTarget}`]).then((output: any) => {
      return output.stdout.split('\n')[0]
    })
  }

  // Verify that latest commit is equal to merge-base commit
  isTargetBranchOutofSync() {
    return this._setupCredentials(this.settings.dir, this.settings.url, this.settings.credentials).then(() => {
      return this.getMergeBase(this.settings.branch.name, this.settings.change.target).then(commitHash1 => {
        return this.getLatestCommitOnTarget(this.settings.change.target).then(commitHash2 => {
          return new Promise(resolve => {
            // eslint-disable-next-line no-console
            console.log(`Source Branch Common Ancestor commit: ${commitHash1}`)
            // eslint-disable-next-line no-console
            console.log(`Target Branch Last Commit - commitHash2: ${commitHash2}`)
            if (commitHash1 === commitHash2) {
              resolve(true)
            } else {
              throw new Error(
                '\n --------------------------------------- \n Status: Cannot be Merged! \n Reason: Your branch is out of sync from target. \n Solution: Rebase, push and then run the Pipeline \n  ---------------------------------------'
              )
            }
          })
        })
      })
    })
  }
} // end GitOp class
