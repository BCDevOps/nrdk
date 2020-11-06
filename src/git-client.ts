import git from 'isomorphic-git'
import * as fs from 'fs'
import {spawn} from 'child_process'

export default class GitClient {
  private static instance: GitClient;

  public static getInstance(): GitClient {
    if (!GitClient.instance) {
      GitClient.instance = new GitClient()
    }
    return GitClient.instance
  }

  public async getLocalBranchName(): Promise<string> {
    return git.currentBranch({fs, dir: process.cwd()}) as Promise<string>
  }

  public async getRemoteBranchName(): Promise<string> {
    const localBranchName = await this.getLocalBranchName()
    return new Promise(resolve => {
      const child = spawn('git', ['config', '--get', `branch.${localBranchName}.merge`], {cwd: process.cwd()})
      child.stdout.on('data', data => {
        const name = data.toString().substr('refs/heads/'.length).trim()
        resolve(name)
        child.kill()
      })
    })
  }

  public async getRemoteUrl(name = 'origin'): Promise<string> {
    return git.getConfig({fs, dir: process.cwd(), path: `remote.${name}.url`}) as Promise<string>
  }
}
