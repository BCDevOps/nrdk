import {BaseCommand} from '../base'
import * as FLAGS from '../flags'

export default class Deploy extends BaseCommand {
  static description = 'Deploy changes to an environment.'

  static hidden = true

  static flags = {
    [FLAGS.FlagNames.CONFIG_SCRIPT]: FLAGS.flagConfigScript,
    [FLAGS.FlagNames.DEPLOY_SCRIPT]: FLAGS.flagDeployScript,
    [FLAGS.FlagNames.ENV]: FLAGS.flagEnvSpec,
    [FLAGS.FlagNames.PULL_REQUEST_NUMBER]: FLAGS.flagPullRequestNumberSpec,
    [FLAGS.FlagNames.GIT_REMOTE_NAME]: FLAGS.flagGitRemoteName,
    [FLAGS.FlagNames.GIT_REMOTE_URL]: FLAGS.flagGitRemoteUrl,
    [FLAGS.FlagNames.GIT_BRANCH]: FLAGS.flagGitBranch,
    [FLAGS.FlagNames.GIT_BRANCH_REMOTE]: FLAGS.flagGitBranchRemote,
    [FLAGS.FlagNames.ARCHETYPE]: FLAGS.flagArchetype,
    [FLAGS.FlagNames.RFC_VALIDATION]: FLAGS.flagRfcValidation,
  }

  async run() {
    const {flags} = this.parse(Deploy)
    await FLAGS.applyFlagDefaults(flags)
    if (flags.archetype) {
      const settings = FLAGS.loadConfigScript(flags)
      const task = FLAGS.loadScript(flags, FLAGS.FlagNames.DEPLOY_SCRIPT)
      if (task.__esModule === true) {
        task.default(Object.assign(settings, {phase: settings.options.env}))
      } else {
        task(Object.assign(settings, {phase: settings.options.env}))
      }
    } else {
      const settings = FLAGS.loadConfigScript(flags)
      const task = FLAGS.loadScript(flags, FLAGS.FlagNames.DEPLOY_SCRIPT)
      task(Object.assign(settings, {phase: settings.options.env}))
    }
  }
}
