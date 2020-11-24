import * as FlagsSpec from '../../flags'
import {FlagNames, applyFlagDefaults} from '../../flags'
import {BaseCommand} from '../../base'
import {JiraEventHandler} from '../../jenkins/on-jira-event'
export default class OnJiraIssue extends BaseCommand {
  static description = 'Process JIRA event payloads. It will signal Jenkins pipeline/build to proceed/resume when ready.'

  static hidden = true

  static flags = {
    [FlagNames.PAYLOAD_FILE]: FlagsSpec.flagPayloadFile,
  }

  async run() {
    const {flags} = this.parse(OnJiraIssue)
    await applyFlagDefaults(flags)
    // const settings = loadConfigScript(flags)
    const handler = new JiraEventHandler()
    const {errors} = await handler.processPayloadFromFile(flags[FlagNames.PAYLOAD_FILE] as string)
    if (errors !== null && errors.length > 0) {
      this.exit(1)
    }
    this.exit(0)
  }
}
