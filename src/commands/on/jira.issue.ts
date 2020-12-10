import * as FlagsSpec from '../../flags'
import {FlagNames, applyFlagDefaults} from '../../flags'
import {BaseCommand} from '../../base'
import {JiraEventHandler} from '../../jenkins/on-jira-event'

import {LoggerFactory} from '../../util/logger'
const logger = LoggerFactory.createLogger('OnJiraIssue')
export default class OnJiraIssue extends BaseCommand {
  static description = 'Process JIRA event payloads. It will signal Jenkins pipeline/build to proceed/resume when ready.'

  static hidden = true

  static flags = {
    [FlagNames.PAYLOAD_FILE]: FlagsSpec.flagPayloadFile,
  }

  async run() {
    logger.info('Starting OnJiraIssue.run() ...')
    const {flags} = this.parse(OnJiraIssue)
    logger.info('Applying default flag values ...')
    await applyFlagDefaults(flags)
    logger.info('Initializing JiraEventHandler ...')
    const handler = new JiraEventHandler()
    // eslint-disable-next-line no-console
    console.log(`payload from file: ${flags[FlagNames.PAYLOAD_FILE]}`)
    const {errors} = await handler.processPayloadFromFile(flags[FlagNames.PAYLOAD_FILE] as string)
    if (errors !== null && errors.length > 0) {
      this.exit(1)
    }
    this.exit(0)
  }
}
