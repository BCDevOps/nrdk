import {BaseCommand} from '../base'
import {FlagNames, flagConfigScript, flagCleanScript, flagEnvSpec, flagPullRequestNumberSpec, flagGitRemoteName, flagGitRemoteUrl, flagGitBranch, flagGitBranchRemote, loadConfigScript, applyFlagDefaults} from '../flags'

export default class Clean extends BaseCommand {
  static description = 'describe the command here'

  static hidden = true

  static flags = {
    [FlagNames.CONFIG_SCRIPT]: flagConfigScript,
    [FlagNames.CLEAN_SCRIPT]: flagCleanScript,
    [FlagNames.ENV]: flagEnvSpec,
    [FlagNames.PULL_REQUEST_NUMBER]: flagPullRequestNumberSpec,
    [FlagNames.GIT_REMOTE_NAME]: flagGitRemoteName,
    [FlagNames.GIT_REMOTE_URL]: flagGitRemoteUrl,
    [FlagNames.GIT_BRANCH]: flagGitBranch,
    [FlagNames.GIT_BRANCH_REMOTE]: flagGitBranchRemote,
  }

  // static args = [{name: 'file'}]
  async run() {
    const {flags} = this.parse(Clean)
    await applyFlagDefaults(flags)
    const settings = loadConfigScript(flags)
    const {BasicJavaApplicationClean} = require('@bcgov/nr-pipeline-ext')
    new BasicJavaApplicationClean(settings).clean()
    // const task = loadScript(flags, FlagNames.CLEAN_SCRIPT)
    // task(Object.assign(settings, {phase: settings.options.env}))
  }
}
