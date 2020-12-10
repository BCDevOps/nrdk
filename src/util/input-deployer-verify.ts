/* eslint-disable max-params */
/* eslint-disable node/no-extraneous-require */
/* eslint-disable no-console */
/* eslint-disable max-depth */
/* eslint-disable no-await-in-loop */
/* eslint-disable valid-jsdoc */
import {Jira} from './jira'
import {ISSUE_LINK_TYPE_NAME, VERIFY_STATUS, REASON} from './constants'
import RFDWOKFLOW from './jira-rfd-workflow-v1.2.2'
import RFCWORKFLOW from './jira-rfc-workflow-v2.0.0'
import chalk from 'chalk'

export default class Verifier {
  settings: any

  constructor(settings: any) {
    this.settings = settings
  }

  async verifyBeforeDeployment() {
    const env = this.settings.options.env.toLowerCase()
    const changeBranch = this.settings.options.git.branch.merge
    const m = /(?<issueKey>\w+-\d+)/m.exec(changeBranch)
    const rfcIssueKey = m?.groups?.issueKey
    if (!rfcIssueKey) throw new Error(`Unable to extract Jira issue key from ${changeBranch}`)
    const result = await this.isReadyForDeployment(env, rfcIssueKey)

    this._printVerifiedStatus(result)
    return result
  } // verifyBeforeDeployment

  /**
     * Return a summary of RFC/RFD(s) context based on 'rfcIssueKey and 'env' requested.
     * Random Example JSON:
     * {"rfcIssueKey":"MyRFCissue-99","rfcStatus":"Authorized for Int",
     * "rfdsByEnv":{"test": {rfds":[{"issueKey":"RFD-AUTO-TEST-01","labels":"auto","env":"test","status":"Closed",
     * "blockedBy":[{"issueKey":"INWARDISSUE-0","status":"Some Other Status","blockingOn":"RFD-AUTO-TEST-01"},{"issueKey":"INWARDISSUE-1","status":"Resolved","blockingOn":"RFD-AUTO-TEST-01"}]},
     * {"issueKey":"RFD-BUSINESS-TEST-01","labels":"some-label","env":"test","status":"Approved","blockedBy":[{"issueKey":"INWARDISSUE-0","status":"Some Other Status","blockingOn":"RFD-BUSINESS-TEST-01"},
     * {"issueKey":"INWARDISSUE-1","status":"Some Other Status","blockingOn":"RFD-BUSINESS-TEST-01"},{"issueKey":"INWARDISSUE-2","status":"Resolved","blockingOn":"RFD-BUSINESS-TEST-01"}]}],
     * "previousEnvRfds":[ {"issueKey":"RFD-AUTO-DLVR-01","env":"dlvr","status":"Closed","labels":"auto"}]}}}
     */
  async obtainCurrentRfcRfdContext(env: string, rfcIssueKey: string) {
    const jiraUrl = this.settings.jiraUrl
    const username = this.settings.phases[env].credentials.idir.user
    const password = this.settings.phases[env].credentials.idir.pass

    const jiraSettings = {
      url: jiraUrl,
      username: username,
      password: password,
      rfcIssueKey: rfcIssueKey,
    }
    const jiraClient = new Jira(Object.assign({phase: 'jira-transition', jira: jiraSettings}))
    let rfcIssue = await jiraClient.retrieveRfcIssueInfo(rfcIssueKey)
    if (rfcIssue === null || rfcIssue === undefined) {
      throw new Error(`Could not find RFC issue with issueKey ${rfcIssueKey}`)
    }
    // console.dir(rfcIssue, { depth: 1 })
    if (rfcIssue.fields.issuetype.name !== 'RFC') {
      for (const fixVersion of rfcIssue.fields.fixVersions) {
        if (fixVersion.released === false && fixVersion.archived === false) {
          const opts = {
            jql: `project = ${rfcIssue.fields.project.id} AND fixVersion = ${fixVersion.id} AND issuetype = RFC  AND statusCategory != Done`,
            fields: ['key'],
          }
          const results = await jiraClient.search(opts)
          if (results.total === 1) {
            // re-fetch
            rfcIssue = await jiraClient.retrieveRfcIssueInfo(results.issues[0].key)
          } else {
            throw new Error(`More than 1 RFC found using jql '${opts.jql}'`)
          }
        }
      }
    }
    // If still couldn't find a RFC, fails it!
    if (rfcIssue.fields.issuetype.name !== 'RFC') {
      throw new Error(
        `Expected issue '${rfcIssue.key}' to be a 'RFC', but found it to be a '${rfcIssue.fields.issuetype.name}'`
      )
    }

    // for building RFC/RFD(s) context return.
    const rfcRfdContext: any = {
      rfcIssueKey: rfcIssue.key,
      rfcStatus: rfcIssue.fields.status.name,
      rfdsByEnv: {[env]: {rfds: [], previousEnvRfds: []}},
    }

    // get RFC-RFD issue links
    for (const rfdIssueLinkInfo of rfcIssue.fields.issuelinks) {
      // RFD issues
      if (rfdIssueLinkInfo.type.name === ISSUE_LINK_TYPE_NAME.RFC_FRD) {
        const issueKey = rfdIssueLinkInfo.outwardIssue.key
        const rfdContext: any = {issueKey}
        // RFD issue detail
        const rfdInfo = await jiraClient.getIssue(issueKey)
        rfdContext.labels = rfdInfo.fields.labels
        if (rfdInfo.fields.customfield_10121.value.toLowerCase() === env) {
          rfdContext.env = rfdInfo.fields.customfield_10121.value
          rfdContext.status = rfdInfo.fields.status.name
          // gather RFD issue links
          const issueLinks = rfdInfo.fields.issuelinks
          rfdContext.blockedBy = []
          if (issueLinks) {
            for (const link of issueLinks) {
              if (link.type.inward === 'is blocked by') {
                rfdContext.blockedBy.push({
                  issueKey: link.inwardIssue.key,
                  status: link.inwardIssue.fields.status.name,
                  blockingOn: issueKey,
                })
              }
            }
          }
          rfcRfdContext.rfdsByEnv[env].rfds.push(rfdContext)
        }
      } // end rfd link type = RFC-RFD
    }

    return rfcRfdContext
  } // obtainCurrentRfcRfdContext

  /**
     * Check current RFC/RFD(s) context for their status and blocked issues based on env.
     * When verification success, return {status: 'Ready', rfcRfdContext}. 'rfcRfdContext'
     *       is the information obtained from JIRA RFC/RFD based on 'env' on that requsted time.
     * When verification is failed, return {status: 'Not Ready', reason: {...}, rfcRfdContext}.
     * Only when verification is failed then the object contains 'reason' property.
     * @param {*} env environment to check
     * @param {*} rfcIssueKey the RFC issue for this deployment
     */
  async isReadyForDeployment(env: string, rfcIssueKey: string) {
    console.log(
      `\n#----------  Verifying Deployment Conditions for targetEnv=${env} with RFC issue=${rfcIssueKey}  ----------#\n`
    )

    const rfcRfdContext = await this.obtainCurrentRfcRfdContext(env, rfcIssueKey)
    const result: any = {status: null, rfcRfdContext, reason: {}} // default return object;

    // collecting current stage invalid status RFD(s)
    const notResolvedBlockByIssues: any[] = []
    const notApprovedRfds: any[] = []
    rfcRfdContext.rfdsByEnv[env].rfds.forEach((rfd: any) => {
      // all blockedBy issue 'Resolved'?
      console.info(`Checking RFD: ${rfd.issueKey} on blockedBy issues...`)
      rfd.blockedBy.forEach((blockedByIssue: any) => {
        if (blockedByIssue.status !== RFDWOKFLOW.STATUS_RESOLVED.name) {
          notResolvedBlockByIssues.push(blockedByIssue)
        }
      })

      // has RFD been approved?
      console.info(`Checking RFD: ${rfd.issueKey} on '${RFDWOKFLOW.STATUS_APPROVED.name}' status...`)
      if (
        !(
          rfd.status === RFDWOKFLOW.STATUS_APPROVED.name ||
                    rfd.status === RFDWOKFLOW.STATUS_SCHEDULED.name ||
                    rfd.status === RFDWOKFLOW.STATUS_REOPENED.name ||
                    rfd.status === RFDWOKFLOW.STATUS_IN_PROGRESS.name ||
                    rfd.status === RFDWOKFLOW.STATUS_RESOLVED.name ||
                    rfd.status === RFDWOKFLOW.STATUS_CLOSED.name
        )
      ) {
        notApprovedRfds.push(rfd)
      }
    })

    if (notResolvedBlockByIssues && notResolvedBlockByIssues.length > 0) {
      console.warn('RFD(s) contains un-resolved blocking issues: %o', notResolvedBlockByIssues)
      result.status = VERIFY_STATUS.NOT_READY
      result.reason[REASON.REASON_CODE_RFD_BLOCKED] = {
        description: REASON.REASON_DESC_RFD_BLOCKED,
        issueItems: notResolvedBlockByIssues,
      }
    }

    if (notApprovedRfds && notApprovedRfds.length > 0) {
      console.warn('RFD(s) contains non-Approved issues: %o', notApprovedRfds)
      result.status = VERIFY_STATUS.NOT_READY
      result.reason[REASON.REASON_CODE_RFD_NOT_APPROVED] = {
        description: REASON.REASON_DESC_RFD_NOT_APPROVED,
        issueItems: notApprovedRfds,
      }
    }

    // collecting previous stage invalid status RFD(s)
    const notClosedPreviousStageIssues: any[] = []
    rfcRfdContext.rfdsByEnv[env].previousEnvRfds.forEach((previousEnvRfd: any) => {
      // all issue 'Closed'?
      console.info(
        `Checking previous RFD: ${previousEnvRfd.issueKey} for '${RFDWOKFLOW.STATUS_CLOSED.name}' status...`
      )
      if (previousEnvRfd.status !== RFDWOKFLOW.STATUS_CLOSED.name) {
        notClosedPreviousStageIssues.push(previousEnvRfd)
      }
    })
    if (notClosedPreviousStageIssues && notClosedPreviousStageIssues.length > 0) {
      console.warn('Contains not closed RFD issues: %o', notClosedPreviousStageIssues)
      result.status = VERIFY_STATUS.NOT_READY
      result.reason[REASON.REASON_CODE_PREVIOUS_RFD_NOT_CLOSED] = {
        description: REASON.REASON_DESC_PREVIOUS_RFD_NOT_CLOSED,
        issueItems: notClosedPreviousStageIssues,
      }
    }

    console.info(`Checking RFC: ${rfcIssueKey} for valid approval status...`)
    const rfcStatus = rfcRfdContext.rfcStatus
    if (rfcStatus.toLowerCase() !== RFCWORKFLOW.STATUS_APPROVED.name.toLowerCase()) {
      console.log(`Invalid RFC status ${rfcStatus} before deployment on env ${env}`)

      result.status = VERIFY_STATUS.NOT_READY
      result.reason[REASON.REASON_CODE_RFC_NOT_AUTHORIZED] = {
        description: REASON.REASON_DESC_RFC_NOT_AUTHORIZED,
        issueItems: [{issueKey: rfcIssueKey, status: rfcStatus, env}],
      }
    }

    // finally all verified.
    if (Object.keys(result.reason).length === 0) {
      result.status = VERIFY_STATUS.READY
      delete result.reason
      console.info(`RFC: ${rfcIssueKey} is valid for ${env} deployment`)
    }

    console.log(
      '\n#-------------------------------------------------------------------------------------------------------#\n\n'
    )
    return result
  } // end isReadyForDeployment

  /**
     * Internal function to print statement for user about Readiness Check for the deployment based on verification
     * 'result'(and its object structure) received from function 'isReadyForDeployment'.
     * @param {*} verifiedResult the 'result' object to perform print statment logic from.
     */
  _printVerifiedStatus(verifiedResult: any) {
    // Internal class only for this function.
    class RfdTableItem {
      blockedBy: any

      issueKey: any

      env: any

      status: any

      labels: any

      constructor(issueKey: any, env: any, status: any, labels: any, blockedBy?: any) {
        this.issueKey = issueKey
        this.env = env
        this.status = status
        this.labels = labels
        if (blockedBy) {
          this.blockedBy = blockedBy
        }
      }
    }

    console.log(
      '\n#---------------------------###  STATUS OF READINESS CHECK FOR DEPLOYMENT  ###--------------------------#\n'
    )

    const boldRedStyle = chalk.bold.red
    const actionRequiredTxtStyle = chalk.bold.yellowBright
    const rfcRfdContext = verifiedResult.rfcRfdContext
    const env = Object.keys(rfcRfdContext.rfdsByEnv)[0]
    const reasonCodes = verifiedResult.reason ? Object.keys(verifiedResult.reason) : null

    // RFC status
    console.info('RFC status: ')
    console.table([{RFC: rfcRfdContext.rfcIssueKey, status: rfcRfdContext.rfcStatus, 'target env': env}])
    console.log('\n')
    if (reasonCodes && reasonCodes.includes(REASON.REASON_CODE_RFC_NOT_AUTHORIZED)) {
      console.warn(boldRedStyle('ACTION REQUIRED:'))
      const notAuthorizedRfc = verifiedResult.reason[REASON.REASON_CODE_RFC_NOT_AUTHORIZED].issueItems[0]
      console.group()
      console.log(
        actionRequiredTxtStyle(
          `RFC '${notAuthorizedRfc.issueKey}' has not been authorized to '${env}'. Please authorize the RFC to '${env}' before deployment.`
        )
      )
      console.groupEnd()
      console.log('\n')
    }

    // RFD(s)
    const rfds = rfcRfdContext.rfdsByEnv[env].rfds
    const rfdrows: any[] = []
    rfds.forEach((rfd: any) => {
      const blockedBySt = rfd.blockedBy.map((issue: any) => issue.issueKey + '(' + issue.status + ')').join(', ')
      const rfdRow = new RfdTableItem(rfd.issueKey, rfd.env, rfd.status, rfd.labels, blockedBySt)
      rfdrows.push(rfdRow)
    })
    console.info('Current Environment RFD Status:')
    console.table(rfdrows)
    console.log('\n')
    if (
      reasonCodes &&
            (reasonCodes.includes(REASON.REASON_CODE_RFD_BLOCKED) ||
                reasonCodes.includes(REASON.REASON_CODE_RFD_NOT_APPROVED))
    ) {
      if (reasonCodes.includes(REASON.REASON_CODE_RFD_BLOCKED)) {
        console.warn(boldRedStyle('ACTION REQUIRED:'))
        const blockedIssueItems = verifiedResult.reason[REASON.REASON_CODE_RFD_BLOCKED].issueItems
        console.group()
        blockedIssueItems.forEach((issue: any) => {
          const blockedBySt = issue.issueKey + '(' + issue.status + ')'
          console.log(
            actionRequiredTxtStyle(
              `RFD '${issue.blockingOn}' is blocked by un-resolved issue(s): '${blockedBySt}'. Please resolve blocking issue(s) before deployment to '${env}'.`
            )
          )
        })
        console.groupEnd()
        console.log('\n')
      }

      if (reasonCodes.includes(REASON.REASON_CODE_RFD_NOT_APPROVED)) {
        console.warn(boldRedStyle('ACTION REQUIRED:'))
        const notApprovedIssueItems = verifiedResult.reason[REASON.REASON_CODE_RFD_NOT_APPROVED].issueItems
        console.group()
        notApprovedIssueItems.forEach((issue: any) => {
          console.log(
            actionRequiredTxtStyle(
              `Current environment RFD '${issue.issueKey}' has not been approved. Please approve the issue before deployment to '${env}'.`
            )
          )
        })
        console.groupEnd()
        console.log('\n')
      }
    }

    const previousEnvRfds = rfcRfdContext.rfdsByEnv[env].previousEnvRfds
    const prfdRows: any[] = []
    previousEnvRfds.forEach((rfd: any) => {
      const prfdRow = new RfdTableItem(rfd.issueKey, rfd.env, rfd.status, rfd.labels)
      prfdRows.push(prfdRow)
    })
    console.info('Previous Environment RFD Status:')
    if (prfdRows && prfdRows.length > 0) {
      console.table(prfdRows)
      console.log('\n')
    } else {
      console.group()
      console.info('N/A')
      console.groupEnd()
      console.log('\n')
    }
    if (reasonCodes && reasonCodes.includes(REASON.REASON_CODE_PREVIOUS_RFD_NOT_CLOSED)) {
      console.warn(boldRedStyle('ACTION REQUIRED:'))
      const notClosedIssueItems = verifiedResult.reason[REASON.REASON_CODE_PREVIOUS_RFD_NOT_CLOSED].issueItems
      console.group()
      notClosedIssueItems.forEach((issue: any) => {
        console.log(
          actionRequiredTxtStyle(
            `Previous environment RFD '${issue.issueKey}' has not been closed. Please close the issue before deployment to '${env}'.`
          )
        )
      })
      console.groupEnd()
      console.log('\n')
    }

    if (reasonCodes) {
      console.log('\n')
      // console.log(boldRedStyle(`==> (Not Ready to deploy to '${env}' environment) <==`));
      // =>   NOT READY
      console.log('=>    NOT READY')
    } else {
      console.log('\n')
      // const readyToDeployTxtStyle = chalk.bold.greenBright
      // console.log(readyToDeployTxtStyle(`==> (Ready to deploy to '${env}' environment) <==`));
      console.log('=>   READY')
    }

    // console.log("\n#-------------------------------------------------------------------------------------------------------#\n");
  }
} // class
