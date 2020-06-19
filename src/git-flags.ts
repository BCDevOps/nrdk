import {flags} from '@oclif/command'
import GitClient from './git-client'

export interface GitFlags {
  'git.remote'?:  flags.IOptionFlag<string | undefined>;
  'git.remote.url'?:  flags.IOptionFlag<string | undefined>;
  'git.branch':  flags.IOptionFlag<string | undefined>;
  'git.branch.remote':  flags.IOptionFlag<string | undefined>;
}

export function createGitFlags(): GitFlags {
  return {
    'git.branch': flags.string({char: 'b', description: 'GIT local branch name to build'}),
    'git.branch.remote': flags.string({char: 'b', description: 'GIT remote branch name to build'}),
  }
}

export async function applyDefaults(flags: any): Promise<void> {
  if (!flags['git.remote']) flags['git.remote'] = 'origin'
  if (!flags['git.remote.url']) flags['git.remote.url'] = await GitClient.getInstance().getRemoteUrl(flags['git.remote'])
  if (!flags['git.branch']) flags['git.branch'] = await GitClient.getInstance().getLocalBranchName()
  if (!flags['git.branch.remote']) flags['git.branch.remote'] = `${flags['git.remote']}/${flags['git.branch']}`
}
