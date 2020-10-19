import {BaseCommand} from '../base'
import {FlagNames, flagConfigScript, flagGitRemoteName, flagGitRemoteUrl, flagGitBranch, flagGitBranchRemote, flagEnvSpec, flagPullRequestNumberSpec, applyFlagDefaults, flagDeployScript, loadConfigScript, loadScript} from '../flags'

export default class Deploy extends BaseCommand {
  static description = 'describe the command here'

  static hidden = true

  static flags = {
    [FlagNames.CONFIG_SCRIPT]: flagConfigScript,
    [FlagNames.DEPLOY_SCRIPT]: flagDeployScript,
    [FlagNames.ENV]: flagEnvSpec,
    [FlagNames.PULL_REQUEST_NUMBER]: flagPullRequestNumberSpec,
    [FlagNames.GIT_REMOTE_NAME]: flagGitRemoteName,
    [FlagNames.GIT_REMOTE_URL]: flagGitRemoteUrl,
    [FlagNames.GIT_BRANCH]: flagGitBranch,
    [FlagNames.GIT_BRANCH_REMOTE]: flagGitBranchRemote,
  }

  async run() {
    const {flags} = this.parse(Deploy)
    await applyFlagDefaults(flags)
    const settings = loadConfigScript(flags)
    const task = loadScript(flags, FlagNames.DEPLOY_SCRIPT)
    task(Object.assign(settings, {phase: settings.options.env}))
  }
}
