import {flags} from '@oclif/command'
import GitClient from './git-client'

export enum FlagNames {
  CONFIG_SCRIPT = 'config-script',
  BUILD_SCRIPT = 'build-script',
  GIT_URL = 'git.url',
  GIT_REMOTE_NAME = 'git.remote.name',
  GIT_REMOTE_URL = 'git.remote.url',
  GIT_BRANCH = 'git.branch.name',
  GIT_BRANCH_REMOTE = 'git.branch.merge',
  ENV = 'env',
  PULL_REQUEST_NUMBER = 'pr',
  DEPLOY_SCRIPT = 'deploy-script',
  CLEAN_SCRIPT = 'clean-script',
  DEV_MODE = 'dev-mode',
}

const defaultValues = {
  [FlagNames.GIT_URL]: async (flags: any) => {
    flags[FlagNames.GIT_URL] = await GitClient.getInstance().getRemoteUrl(flags[FlagNames.GIT_REMOTE_NAME])
  },
  [FlagNames.GIT_REMOTE_URL]: async (flags: any) => {
    flags[FlagNames.GIT_REMOTE_URL] = await GitClient.getInstance().getRemoteUrl(flags[FlagNames.GIT_REMOTE_NAME])
  },
  [FlagNames.GIT_BRANCH]: async (flags: any) => {
    flags[FlagNames.GIT_BRANCH] = await GitClient.getInstance().getLocalBranchName()
  },
  [FlagNames.GIT_BRANCH_REMOTE]: async (flags: any) => {
    if (!flags[FlagNames.GIT_BRANCH_REMOTE]) {
      flags[FlagNames.GIT_BRANCH_REMOTE] = `${flags[FlagNames.GIT_BRANCH]}`
      // If it is running from Jenkins, using the Bitbucket Branch Source plugin,
      // the CHANGE_BRANCH environment variable is provided with the source branch name
      if (process.env.CHANGE_BRANCH) {
        flags[FlagNames.GIT_BRANCH_REMOTE] = `${process.env.CHANGE_BRANCH}`
      }
    }
  },
}

export const flagConfigScript = flags.string({name: FlagNames.CONFIG_SCRIPT, hidden: true, default: `${process.cwd()}/.pipeline/lib/config.js`})
export const flagBuildScript = flags.string({name: FlagNames.BUILD_SCRIPT, hidden: true, default: `${process.cwd()}/.pipeline/lib/build.js`})
export const flagDeployScript = flags.string({name: FlagNames.DEPLOY_SCRIPT, hidden: true, default: `${process.cwd()}/.pipeline/lib/deploy.js`})
export const flagCleanScript = flags.string({name: FlagNames.CLEAN_SCRIPT, hidden: true, default: `${process.cwd()}/.pipeline/lib/clean.js`})
export const flagGitRemoteName = flags.string({description: 'GIT remote name', required: false, default: 'origin'})
export const flagGitUrl = flags.string({description: 'GIT URL', required: false})
export const flagGitRemoteUrl = flags.string({description: 'GIT remote URL', required: false})
export const flagGitBranch = flags.string({char: 'b', description: 'GIT local branch name'})
export const flagGitBranchRemote = flags.string({description: 'GIT remote branch name'})
export const flagPullRequestNumberSpec = flags.string({name: FlagNames.PULL_REQUEST_NUMBER, description: 'Pull Request number'})
export const flagEnvSpec = flags.string({name: 'env', description: 'Environment'})
export const flagDevMode = flags.boolean({name: FlagNames.DEV_MODE, description: 'Developer Mode (local)'})

export async function applyFlagDefaults(flags: any) {
  for (const key of Object.keys(defaultValues)) {
    const defaultFn = (defaultValues as any)[key]
    if (defaultFn !== null) {
      // eslint-disable-next-line no-await-in-loop
      await defaultFn(flags)
    }
  }
}

export function createGitFlags() {
  return {
    [FlagNames.GIT_REMOTE_NAME]: flagGitRemoteName,
    [FlagNames.GIT_REMOTE_URL]: flagGitRemoteUrl,
    [FlagNames.GIT_BRANCH]: flagGitBranch,
    [FlagNames.GIT_BRANCH_REMOTE]: flagGitBranchRemote,
  }
}

export function loadScript(flags: any, flagName: string) {
  const configScriptPath = flags[flagName] as string
  return require(configScriptPath)
}

export function parseFlagsAsNestedObject(flags: any) {
  const options = {}
  for (const key of Object.keys(flags)) {
    const parts = key.split('.')
    let container: any = options
    for (let i = 0; i < parts.length; i++) {
      if (i < parts.length - 1) {
        // eslint-disable-next-line no-multi-assign
        container = container[parts[i]] = container[parts[i]] || {}
      } else {
        container[parts[i]] = flags[key]
      }
    }
  }
  return options
}
export function loadConfigScript(flags: any) {
  const Config = loadScript(flags, FlagNames.CONFIG_SCRIPT)
  const options = parseFlagsAsNestedObject(flags)
  require('@bcgov/pipeline-cli').Util.applyArgumentsDefaults(options)
  // eslint-disable-next-line no-console
  // console.dir(options, {depth: 4})
  return new Config(options).build()
}
