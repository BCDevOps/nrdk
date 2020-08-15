import {FlagNames, flagGitRemoteName, flagGitRemoteUrl, flagGitBranch, flagGitBranchRemote, applyFlagDefaults, flagConfigScript, flagBuildScript, loadConfigScript, flagEnvSpec} from '../../flags'
import {BaseCommand} from '../../base'

export default class OnJiraIssue extends BaseCommand {
  static description = 'describe the command here'

  static flags = {
    [FlagNames.CONFIG_SCRIPT]: flagConfigScript,
    [FlagNames.BUILD_SCRIPT]: flagBuildScript,
    [FlagNames.GIT_REMOTE_NAME]: flagGitRemoteName,
    [FlagNames.GIT_REMOTE_URL]: flagGitRemoteUrl,
    [FlagNames.GIT_BRANCH]: flagGitBranch,
    [FlagNames.GIT_BRANCH_REMOTE]: flagGitBranchRemote,
    [FlagNames.ENV]: flagEnvSpec,
  }

  async run() {
    const {flags} = this.parse(OnJiraIssue)
    await applyFlagDefaults(flags)
    const {InputDeployerVerify} = require('nr-pipeline-ext')
    const settings = loadConfigScript(flags)
    const verify = new InputDeployerVerify(Object.assign(settings))
    const result = await verify.verifyBeforeDeployment()
    if (result.status === 'Ready') {
      this.exit(0)
    } else {
      this.exit(1)
    }
    // return verify.verifyBeforeDeployment()
  }
}
