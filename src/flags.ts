import {flags} from '@oclif/command'
import GitClient from './git-client'
import {relative, resolve} from 'path'

export enum FlagNames {
  CONFIG_SCRIPT = 'config-script',
  BUILD_SCRIPT = 'build-script',
  GIT_URL = 'git.url',
  GIT_REMOTE_NAME = 'git.remote.name',
  GIT_REMOTE_URL = 'git.remote.url',
  GIT_BRANCH = 'git.branch.name',
  GIT_BRANCH_REMOTE = 'git.branch.merge',
  GIT_CHANGE_TARGET = 'git.change.target',
  ENV = 'env',
  PULL_REQUEST_NUMBER = 'pr',
  DEPLOY_SCRIPT = 'deploy-script',
  CLEAN_SCRIPT = 'clean-script',
  DEV_MODE = 'dev-mode',
  ARCHETYPE = 'archetype',
  RFC_VALIDATION = 'rfc-validation',
  DRY_RUN = 'dry-run',
  PAYLOAD_FILE = 'payload-file',
}

const defaultValues = {
  [FlagNames.GIT_URL]: async (flags: any) => {
    if (!GitClient.getInstance().isGitRepositoryTopLevel()) return
    flags[FlagNames.GIT_URL] = await GitClient.getInstance().getRemoteUrl(flags[FlagNames.GIT_REMOTE_NAME])
  },
  [FlagNames.GIT_REMOTE_URL]: async (flags: any) => {
    if (!GitClient.getInstance().isGitRepositoryTopLevel()) return
    flags[FlagNames.GIT_REMOTE_URL] = await GitClient.getInstance().getRemoteUrl(flags[FlagNames.GIT_REMOTE_NAME])
  },
  [FlagNames.GIT_BRANCH]: async (flags: any) => {
    if (!GitClient.getInstance().isGitRepositoryTopLevel()) return
    flags[FlagNames.GIT_BRANCH] = await GitClient.getInstance().getLocalBranchName()
  },
  [FlagNames.GIT_BRANCH_REMOTE]: async (flags: any) => {
    if (!GitClient.getInstance().isGitRepositoryTopLevel()) return
    if (!flags[FlagNames.GIT_BRANCH_REMOTE]) {
      flags[FlagNames.GIT_BRANCH_REMOTE] = `${flags[FlagNames.GIT_BRANCH]}`
      // If it is running from Jenkins, using the Bitbucket Branch Source plugin,
      // the CHANGE_BRANCH environment variable is provided with the source branch name
      if (process.env.CHANGE_BRANCH) {
        flags[FlagNames.GIT_BRANCH_REMOTE] = `${process.env.CHANGE_BRANCH}`
      }
    }
  },
  [FlagNames.GIT_CHANGE_TARGET]: async (flags: any) => {
    if (!GitClient.getInstance().isGitRepositoryTopLevel()) return
    if (!flags[FlagNames.GIT_CHANGE_TARGET] && process.env.CHANGE_TARGET) {
      flags[FlagNames.GIT_CHANGE_TARGET] = process.env.CHANGE_TARGET
    } else if (!flags[FlagNames.GIT_CHANGE_TARGET]) {
      flags[FlagNames.GIT_CHANGE_TARGET] = await GitClient.getInstance().getRemoteBranchName()
    }
  },
  [FlagNames.BUILD_SCRIPT]: async (flags: any) => {
    if (flags[FlagNames.ARCHETYPE] && !flags[FlagNames.BUILD_SCRIPT]) {
      flags[FlagNames.BUILD_SCRIPT] = resolve(__dirname, `./archetypes/${flags[FlagNames.ARCHETYPE]}/build`)
    } else if (!flags[FlagNames.BUILD_SCRIPT]) {
      flags[FlagNames.BUILD_SCRIPT] = `${relative(process.cwd(), '.pipeline/lib/build')}`
    }
  },
  [FlagNames.DEPLOY_SCRIPT]: async (flags: any) => {
    if (flags[FlagNames.ARCHETYPE] && !flags[FlagNames.DEPLOY_SCRIPT]) {
      flags[FlagNames.DEPLOY_SCRIPT] = resolve(__dirname, `./archetypes/${flags[FlagNames.ARCHETYPE]}/deploy`)
    } else if (!flags[FlagNames.DEPLOY_SCRIPT]) {
      flags[FlagNames.DEPLOY_SCRIPT] = `${relative(process.cwd(), '.pipeline/lib/deploy')}`
    }
  },
}

export const flagConfigScript = flags.string({name: FlagNames.CONFIG_SCRIPT, hidden: true, default: `${relative(process.cwd(), '.pipeline/lib/config.js')}`})
export const flagBuildScript = flags.string({name: FlagNames.BUILD_SCRIPT, hidden: true})
export const flagDeployScript = flags.string({name: FlagNames.DEPLOY_SCRIPT, hidden: true})
export const flagCleanScript = flags.string({name: FlagNames.CLEAN_SCRIPT, hidden: true, default: `${relative(process.cwd(), '.pipeline/lib/clean.js')}`})
export const flagGitRemoteName = flags.string({description: 'GIT remote name', required: false, default: 'origin'})
export const flagGitUrl = flags.string({description: 'GIT URL', required: false})
export const flagGitRemoteUrl = flags.string({description: 'GIT remote URL', required: false})
export const flagGitBranch = flags.string({char: 'b', description: 'GIT local branch name'})
export const flagGitBranchRemote = flags.string({description: 'GIT remote branch name'})
export const flagGitChangeTarget = flags.string({description: 'Target branch of the pull request (env:CHANGE_TARGET)'})
export const flagPullRequestNumberSpec = flags.string({name: FlagNames.PULL_REQUEST_NUMBER, description: 'Pull Request number'})
export const flagEnvSpec = flags.string({name: 'env', description: 'Environment'})
export const flagDevMode = flags.string({name: FlagNames.DEV_MODE, description: 'Developer Mode (local). This will force builds to take the user/workstation work directory as source instead of a fresh clone', options: ['true', 'false'], default: 'false'})
export const flagArchetype = flags.string({name: 'archetype', description: 'Application Archetype/Pattern', options: ['java-web-app', 'liquibase']})
export const flagRfcValidation = flags.boolean({name: FlagNames.RFC_VALIDATION, description: 'Validate RFC?', default: true, allowNo: true})
export const flagDryRun = flags.boolean({name: FlagNames.DRY_RUN, description: 'Dry-run', default: false})
export const flagPayloadFile = flags.string({description: 'Event payload file'})

export async function applyFlagDefaults(flags: any) {
  for (const key of Object.keys(defaultValues)) {
    const defaultFn = (defaultValues as any)[key]
    if (defaultFn !== null) {
      // eslint-disable-next-line no-await-in-loop
      await defaultFn(flags)
    }
  }
  const _flags = []
  for (const entry of Object.entries(flags)) {
    _flags.push(`--${entry[0]}=${entry[1]}`)
  }
  // eslint-disable-next-line no-console
  console.info(_flags.join(' '))
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
  return require(resolve(process.cwd(), configScriptPath))
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
