import git from 'isomorphic-git'
import * as fs from 'fs'

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

  public async getRemoteUrl(name = 'origin'): Promise<string> {
    return git.getConfig({fs, dir: process.cwd(), path: `remote.${name}.url`}) as Promise<string>
  }
}
