import git from 'isomorphic-git'
import * as fs from 'fs'
import {spawn} from 'child_process'
import PropertiesFile from './util/properties-file'
import {Secret} from './api/service/secret-manager'

const env = Object.assign({}, process.env)
export interface GitCredential {
    username: string;
    password: Secret;
}

export default class GitClient {
  private static instance: GitClient

  private cachedRepositoryTopLevel?: string

  private cachedIsGitRepositoryTopLevel?: boolean

  public static getInstance(): GitClient {
    if (!GitClient.instance) {
      GitClient.instance = new GitClient()
    }
    return GitClient.instance
  }

  static async getCachedCredential(url: string): Promise<GitCredential | undefined> {
    const child = spawn('git', ['credential', 'fill'], {env})
    child.stdin.end(`url=${url}`, 'utf-8')
    const properties = await PropertiesFile.read(child.stdout)
    const username = properties.get('username')
    const password = properties.get('password')
    if (username && password) {
      return {username: username, password: new Secret(password)}
    }
  }

  public async getLocalBranchName(): Promise<string> {
    return git.currentBranch({fs, dir: (await this.gitRepositoryTopLevel())}) as Promise<string>
  }

  public async getRemoteBranchName(): Promise<string> {
    const localBranchName = await this.getLocalBranchName()
    return this.gitRepositoryTopLevel()
    .then(cwd => {
      return new Promise(resolve => {
        const child = spawn('git', ['config', '--get', `branch.${localBranchName}.merge`], {cwd: cwd})
        child.stdout.on('data', data => {
          const name = data.toString().substr('refs/heads/'.length)
          .trim()
          resolve(name)
          child.kill()
        })
      })
    })
  }

  public async isGitRepositoryTopLevel(): Promise<boolean> {
    if (typeof this.cachedIsGitRepositoryTopLevel === 'boolean') return this.cachedIsGitRepositoryTopLevel
    return new Promise((resolve, reject) => {
      const child = spawn('git', ['rev-parse', '--show-toplevel'], {cwd: process.cwd()})
      child.on('error', err => {
        reject(err)
      })
      child.on('exit', code => {
        this.cachedIsGitRepositoryTopLevel = true
        if (code !== 0) this.cachedIsGitRepositoryTopLevel = false
        resolve(this.cachedIsGitRepositoryTopLevel)
      })
    })
  }

  public async gitRepositoryTopLevel(): Promise<string> {
    if (this.cachedRepositoryTopLevel) return this.cachedRepositoryTopLevel
    return new Promise((resolve, reject) => {
      const child = spawn('git', ['rev-parse', '--show-toplevel'], {cwd: process.cwd()})
      child.stdout.on('data', data => {
        this.cachedRepositoryTopLevel = data.toString().trim()
        resolve(this.cachedRepositoryTopLevel as string)
        child.kill()
      })
      child.on('error', err => {
        reject(err)
      })
    })
  }

  public async getRemoteUrl(name = 'origin'): Promise<string> {
    return git.getConfig({fs, dir: (await this.gitRepositoryTopLevel()), path: `remote.${name}.url`}) as Promise<string>
  }
}
