import {BaseCommand} from '../base'
import {FlagNames, flagConfigScript, flagGitRemoteName, flagGitRemoteUrl, flagGitBranch, flagGitBranchRemote, flagEnvSpec, flagPullRequestNumberSpec, applyFlagDefaults,  loadConfigScript} from '../flags'

export default class FunctionalTest extends BaseCommand {
  static description = 'command to run functional tests for projects'

  static flags = {
    [FlagNames.CONFIG_SCRIPT]: flagConfigScript,
    [FlagNames.ENV]: flagEnvSpec,
    [FlagNames.PULL_REQUEST_NUMBER]: flagPullRequestNumberSpec,
    [FlagNames.GIT_REMOTE_NAME]: flagGitRemoteName,
    [FlagNames.GIT_REMOTE_URL]: flagGitRemoteUrl,
    [FlagNames.GIT_BRANCH]: flagGitBranch,
    [FlagNames.GIT_BRANCH_REMOTE]: flagGitBranchRemote,
  }

  async run() {
    const {flags} = this.parse(FunctionalTest)
    await applyFlagDefaults(flags)
    const settings = loadConfigScript(flags)
    const {BasicFunctionalTester} = require('nr-pipeline-ext')
    new BasicFunctionalTester(settings).runFunctionalTests()
  }
}
