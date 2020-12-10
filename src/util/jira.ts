/* eslint-disable max-params */
/* eslint-disable no-negated-condition */
/* eslint-disable lines-between-class-members */
/* eslint-disable max-statements-per-line */
/* eslint-disable no-console */
/* eslint-disable guard-for-in */
/* eslint-disable no-await-in-loop */
/* eslint-disable valid-jsdoc */
// import JiraClient from "jira-connector"; // node does not support ES6 import yet in year 2019.
// ref: https://timonweb.com/tutorials/how-to-enable-ecmascript-6-imports-in-nodejs/

import JiraClient from 'jira-connector'
import {GeneralError} from '../error'
import * as CONST from './constants'
import RFDWOKFLOW from './jira-rfd-workflow-v1.2.2'

const JIRA_ENV_REVIEWER = CONST.JIRA_ENV_REVIEWER
const ISSUE_TYPE_CODE = CONST.ISSUE_TYPE_CODE

// const ISSUE_STATUS_NAME = CONST.ISSUE_STATUS_NAME
// const ISSUE_TRANSITION_ACTION_NAME = CONST.ISSUE_TRANSITION_ACTION_NAME

/**
 * The template for creating JIRA Issue.
 */
class IssueTemplate {
  template: any

  constructor(type: string, params: any) {
    this.template = {
      fields: {
        project: {key: params.projectName},
        issuetype: {name: type},
        customfield_10121: {value: params.env},

        // RFD type specific fields/values.
        ...(type === ISSUE_TYPE_CODE.RFD && {
          labels: [params.projectName, 'auto'],
          fixVersions: [{name: params.version}],
          description: `Deploying changes from PR NO: ${params.branchName} in REPO: ${params.repoName}`,
          summary: `RFD-${params.env}-${params.changeBranch}-${params.branchName}`,
        }),

        // RFD-subtask type specific fields/values.
        ...(type === ISSUE_TYPE_CODE.RFD_SUBTASK && {
          parent: {key: params.rfdIssueKey},
          summary: `RFD-Subtask-${params.env}-${params.changeBranch}-${params.branchName}-${params.reviewer}-Review`,
          components: [{name: params.repoName}],
        }),
      },
    }
  }
}

/**
 * This class handles RFC and RFD creation,  and other utility functions
 * based on current RFC/RFD workflow.
 */
export class Jira {
  jiraClientInitialized = false
  rfcIssueInitialized: boolean
  jiraSettings: any
  rfcIssue: any
  jiraClient: JiraClient

  constructor(settings: any) {
    this.jiraSettings = settings.jira
    this.jiraClientInitialized = false // depends on jira-connector:JiraClient.
    this.rfcIssueInitialized = false // depends on if RFC issue can be retrieved.

    this.jiraClient = new JiraClient({
      host: this.jiraSettings.url, // jira url, no http.
      basic_auth: {
        username: this.jiraSettings.username,
        password: this.jiraSettings.password,
      },
    })
    this.jiraClientInitialized = true
  }

  static parseJiraIssueKey(text: string) {
    const m = /(?<issueKey>\w+-\d+)/m.exec(text)
    return m?.groups?.issueKey
  }

  /**
     * Function ensures the RFD issues are created and linked to RFC issue for each environment.
     * Also ensure RFC/RFD/RFD subtasks status  to the state intended.
     */
  async createRFD() {
    const rfcIssueKey = this.jiraSettings.rfcIssueKey

    // Retrieving RFC issue info
    const rfcIssue = await this.retrieveRfcIssueInfo(this.jiraSettings.rfcIssueKey)
    this.rfcIssue = rfcIssue

    // Initialize JIRA component (if not exists)
    const projectName = this.jiraSettings.projectName
    const repoName = this.jiraSettings.repoName
    const changeBranch = this.jiraSettings.changeBranch
    await this.initializeProjectComponent(projectName, repoName)
    // let containRfcToRfdLinks = 0

    const rfdIssueLinks = []
    for (const issueLink of rfcIssue.fields.issuelinks) {
      if (issueLink.type.id === '10300') {
        // TOFIX: containRfcToRfdLinks - never used?
        // containRfcToRfdLinks += 1
        rfdIssueLinks.push(issueLink.outwardIssue.key)
      }
    }
    let containsAutomatedRfdIssueLinks = 0
    for (const key in rfdIssueLinks) {
      const rfdIssueInfo = await this.getIssue(rfdIssueLinks[key])
      if (rfdIssueInfo.fields.labels.includes('auto')) {
        containsAutomatedRfdIssueLinks += 1
      } else {
        await this.editIssue(rfdIssueLinks[key], repoName, changeBranch)
      }
    }
    // console.log(containsAutomatedRfdIssueLinks)
    // const containsIssueLinks = rfcIssue.fields.issuelinks != undefined && rfcIssue.fields.issuelinks.length > 0;
    if (!containsAutomatedRfdIssueLinks) {
      console.log('No automated RFD issueLinks found for RFC issue: ' + rfcIssueKey)

      const branchName = this.jiraSettings.branchName

      // loop for each env using ARRAY.
      for (const ENV of JIRA_ENV_REVIEWER) {
        // new RFD created.
        // await self.editIssue(rfcIssueKey,repoName)
        const newRfdIssue = await this.createRfdAndLinkToRfc(
          rfcIssueKey,
          projectName,
          repoName,
          changeBranch,
          branchName,
          ENV.ENV
        )
        const rfdIssueKey = newRfdIssue.key
        await this.createRfdSubtasks(
          rfdIssueKey,
          projectName,
          repoName,
          changeBranch,
          branchName,
          ENV.ENV,
          ENV.REVIEWER
        )
      }
    } else {
      for (const issuelink of rfcIssue.fields.issuelinks) {
        if (issuelink.type.id === '10300') {
          const rfdIssueInfo = await this.getIssue(issuelink.outwardIssue.key)
          if (rfdIssueInfo.fields.labels.includes('auto')) {
            await this._manageRfdAndSubtasksTransitionToInitialState(issuelink.outwardIssue.key)
          }
        }
      }
    }
    return Promise.resolve(true)
  }

  /**
     * RFD subtasks (for now we set it for 2 will be created) will be creted for the RFD.
     * After they are being created the subtasks will be also transitioned to Submitted.
     * @param {*} rfdIssueKey parent issueKey
     * @param {*} projectName JIRA create param
     * @param {*} repoName JIRA create param
     * @param {*} changeBranch JIRA create param
     * @param {*} branchName JIRA create param
     * @param {*} jiraTargetEnv set the "Target environment" on JIRA (this is custom field - customfield_10121)
     * @param {*} reviewer JIRA create param
     */
  async createRfdSubtasks(rfdIssueKey: any, projectName: any, repoName: any, changeBranch: any, branchName: any, jiraTargetEnv: any, reviewer: any) {
    // 2 new RFD subtasks created.
    const rfdSubTaskIssue = await this.createIssue(ISSUE_TYPE_CODE.RFD_SUBTASK, {
      projectName: projectName,
      env: jiraTargetEnv,
      rfdIssueKey: rfdIssueKey,
      changeBranch: changeBranch,
      branchName: branchName,
      reviewer: reviewer,
      repoName: repoName,
    })
    await this._transition(rfdSubTaskIssue.key, RFDWOKFLOW.ACTION_731.name) // 731 submitted
  }

  /**
     * RFD will be created and linked to it's RFC.
     * After it is created rfd will be also transitioned to Submitted.
     * @param {*} rfcIssueKey the RFC to be linked to
     * @param {*} projectName JIRA create param
     * @param {*} repoName JIRA create param
     * @param {*} changeBranch JIRA create param
     * @param {*} branchName JIRA create param
     * @param {*} jiraTargetEnv set the "Target environment" on JIRA (this is custom field - customfield_10121)
     */
  async createRfdAndLinkToRfc(rfcIssueKey: any, projectName: any, repoName: any, changeBranch: any, branchName: any, jiraTargetEnv: any) {
    console.log('createRfdAndLinkToRfc() with rfcIssueKey: ' + rfcIssueKey)

    let rfcIssueVersion
    try {
      const rfcIssue = await this.retrieveRfcIssueInfo(rfcIssueKey)
      rfcIssueVersion = rfcIssue.fields.fixVersions[0].name
    } catch (error) {
      throw new Error('The RFC version is not defined. Please define a version in RFC and restart the pipeline.')
    }

    // new RFD created.
    const newRfdIssue = await this.createIssue(ISSUE_TYPE_CODE.RFD, {
      version: rfcIssueVersion,
      projectName: projectName,
      env: jiraTargetEnv,
      changeBranch: changeBranch,
      branchName: branchName,
      repoName: repoName,
    })

    // issue link between RFD and RFC
    const jiraClient = this.getJiraClient()
    const rfdIssueKey = newRfdIssue.key
    jiraClient.issueLink.createIssueLink({
      issueLink: {
        type: {id: '10300'},
        inwardIssue: {key: rfcIssueKey},
        outwardIssue: {key: rfdIssueKey},
      },
    })

    await this._transition(rfdIssueKey, RFDWOKFLOW.ACTION_731.name) // 731 submitted
    return newRfdIssue
  }

  /**
     * Initialize JIRA project 'component' to the 'repoName' if not exists.
     * @param {string} projectName
     * @param {string} repoName
     * @returns {Promise<boolean>} new component return if not exists previously or 'true' if found.
     */
  async initializeProjectComponent(projectName: string, repoName: string) {
    let projectInfo: any = {}
    const jiraClient = this.getJiraClient()
    try {
      projectInfo = await jiraClient.project.getProject({projectIdOrKey: projectName})
    } catch (error) {
      throw new GeneralError('Could not get JIRA project using projectName: ' + projectName, error)
    }

    if (projectInfo.components.findIndex((c: any) => c.name === repoName) === -1) {
      const newComponent = await jiraClient.component.createComponent({
        component: {name: repoName, project: projectName},
      })
      console.log('JIRA component was created with: ' + projectName + ' for project: ' + projectName)
      return newComponent
    }
    return true
  }

  /**
     * Async wrapper function to retrieve RFC issue.
     * @param {string} rfcIssueKey
     * @return {Promise} Resolved with RFC issue data.
     */
  async retrieveRfcIssueInfo(rfcIssueKey: string) {
    if (rfcIssueKey === undefined || rfcIssueKey === null) {
      throw new Error("Missing 'rfcIssueKey' argument")
    }
    if (this.rfcIssueInitialized) {
      return this.rfcIssue
    }

    console.log('Retrieving RFC issue with issueKey: ' + rfcIssueKey)
    return this.getIssue(rfcIssueKey)
  }

  /**
     * Transitioning issue @issueKey using @transitionAction to some target status.
     * The function first search possible transtion status from JIRA client before making the .
     * If the transitionAction can be found, it will use the "id" to make the  through JIRA.
     * If the transitionAction is not found for this issue, error will be thrown.
     * @param {string} issueKey
     * @param {string} transitionAction the name/code of the action to .
     *                 Note, this is not the 'status' code/name; it is the 'action' to  to other status.
     */
  async _transition(issueKey: string, transitionAction: string) {
    try {
      let issue = await this.getIssue(issueKey)
      // console.log("~Before  - Issue: " + issueKey + ", status: " + issue.fields.status.name);

      // based on issueKey, finding possible actions to  from JIRA client
      // console.log("Transitioning " + issueKey + " with action: " + transitionAction);
      const possibleTransitionsReturn = await this.jiraClient.issue.getTransitions({issueKey: issueKey})
      const possibleActions = possibleTransitionsReturn.transitions
      if (possibleActions === undefined || possibleActions.length === 0) {
        throw new Error(
          "Could not found possible ''. Could not transtion issue: " +
                        issueKey +
                        ' based on current issue status. Possibly the  does not exist or cannot be performed on the issue.'
        )
      }
      // console.log("Possible actions to : ");
      // console.log(possibleActions);

      // checking if user's  action is valid
      const foundTransition = possibleActions.find((t: any) => t.name.toLowerCase() === transitionAction.toLowerCase())
      if (foundTransition === undefined) {
        const possibleTreansitionActionName = possibleActions.map((t: any) => t.name)
        throw new Error(
          `Could not '${transitionAction}' issue with status ${issue.fields.status.name} (${issue.fields.status.id}). Only these actions are possible: ${possibleTreansitionActionName}`
        )
      }

      // transition using the id found from JIRA client
      const transitionId = foundTransition.id
      // console.log(issueKey + " is transitioning with action: " + transitionAction + "(" + transitionId + ")");
      const response = await this.jiraClient.issue.transitionIssue({
        issueKey: issueKey,
        transition: {id: transitionId},
      })
      // console.log("Successfully " + transitionAction + "(" + transitionId + ")" + " issueKey: " + issueKey);

      issue = await this.getIssue(issueKey)
      console.log('~After transition - Issue: ' + issueKey + ', status: ' + issue.fields.status.name)

      return response // it actually is empty "" from JIRA when succeeded.
    } catch (error) {
      throw new GeneralError('Could not ' + transitionAction + ' for issueKey: ' + issueKey, error)
    }
  }

  search(opts: any) {
    try {
      const results = this.getJiraClient().search.search(opts)
      return results.catch((error: any) => {
        if (typeof error === 'string') {
          const obj = JSON.parse(error)
          // eslint-disable-next-line prettier/prettier
          throw new Error(
            `Error searching for issues ${JSON.stringify(opts)} (${obj.statusCode}) -- ${
              obj.request.method
            } ${obj.request.uri.href}`
          )
        }
        throw new Error(`Error searching for issues ${JSON.stringify(opts)}`)
      })
      // console.log("Issue are successfully retrieved for issueKey: " + issueKey);
    } catch (error) {
      throw new GeneralError(`Error searching for issues ${JSON.stringify(opts)}`, error)
    }
  }

  /**
     * A wrapper function to use jira-connector to get issue with 'issueKey'
     * @param {*} issueKey issueKey to get the issue.
     * @returns {Promise} found issue.
     */
  async getIssue(issueKey: string) {
    try {
      return this.getJiraClient().issue.getIssue({issueKey: issueKey})
      .catch((error: any) => {
        if (typeof error === 'string') {
          const obj = JSON.parse(error)
          // eslint-disable-next-line prettier/prettier
          throw new Error(
            `Error fetching issue ${issueKey} (${obj.statusCode}) -- ${obj.request.method} ${obj.request.uri.href}`
          )
        }
        throw new GeneralError(`Error fetching issue ${issueKey}`, error)
      })
      // console.log("Issue are successfully retrieved for issueKey: " + issueKey);
    } catch (error) {
      throw new GeneralError('Could not retrieve issue with issueKey: ' + issueKey, error)
    }
  }

  /**
     * A wrapper function to use jira-connector to create issue with different 'issueType'
     * @param {string} issueType issueType to create, see ISSUE_TYPE_CODE const.
     * @param {*} createParams params to build JIRA issue fields.
     * @returns {Promise} the newly created issue.
     */
  async createIssue(issueType: string, createParams: any) {
    const createIssuePayload = new IssueTemplate(issueType, createParams).template
    // console.log(JSON.stringify(createIssuePayload, null, 2));

    try {
      const issue = await this.jiraClient.issue.createIssue(createIssuePayload)
      console.log('Issue was successfully created with issueType: ' + issue.key + '(' + issueType + ')')
      return issue
    } catch (error) {
      throw new GeneralError('Could not create issue with issueType: ' + issueType, error)
    }
  }

  /**
     * Initializing JIRA client from jira-connector.
     * @returns {JiraClient} JiraClient with the configuration.
     */
  getJiraClient() {
    return this.jiraClient
  }

  /**
     * Get the RFD task(s) issueKeys from RFC for the 'env'.
     * Note, current filter stratgy is based on the assumption that the summary field
     * contain 'env' text on exact match.
     * @param {string} rfcIssueKey the parent RFC ticket issueKey
     * @param {string} jiraTargetEnv this is the text ('env') to be filtered on (and is defined in constants.js)
     * @return {Promise<Array>} array of rfdIssueKeys if exists. If it has item, usually it only contains 1 issue in each env.
     */
  getRfdTaskIds(rfcIssueKey: string, jiraTargetEnv: string) {
    return this.retrieveRfcIssueInfo(rfcIssueKey).then(async rfcIssue => {
      const rfdIssueKeys = []
      for (const issuelink of rfcIssue.fields.issuelinks) {
        if (issuelink.type.id === '10300') {
          const rfdIssueInfo = await this.getIssue(issuelink.outwardIssue.key)
          if (
            rfdIssueInfo.fields.labels.includes('auto') &&
                        issuelink.outwardIssue.fields.summary.includes(jiraTargetEnv)
          ) {
            rfdIssueKeys.push(issuelink.outwardIssue.key)
          }
        }
      }
      // console.log(rfdIssueKeys)
      console.log(
        'RFC ' + rfcIssueKey + ', target env: ' + jiraTargetEnv + ', contains these RFDs: ' + rfdIssueKeys
      )
      return Promise.resolve(rfdIssueKeys)
    })
  }

  /**
     * Obtain subtasks for the issue.
     * @param {string} issueId to get the subtasks from
     * @return {Promise} subtasks array object infomation.
     */
  getIssueSubtasksInfo(issueId: string) {
    return this.getIssue(issueId).then((issueInfo: any) => issueInfo.fields.subtasks)
  }

  /**
     * Manage the transition for RFD and the subtasks.
     * @param {string} rfdIssueKey
     */
  async _manageRfdAndSubtasksTransitionToInitialState(rfdIssueKey: string) {
    console.log('Manage RFD and subtasks transition for RFD issue: ' + rfdIssueKey)
    const rfdIssue = await this.getIssue(rfdIssueKey)
    const rfdIssueStatus = rfdIssue.fields.status.name as string
    console.log('RFD issue status: ' + rfdIssueStatus)
    // let doTransitionForSubtasks = true; // default

    if (rfdIssueStatus === RFDWOKFLOW.STATUS_RESOLVED.name || rfdIssueStatus === RFDWOKFLOW.STATUS_CLOSED.name) {
      // re-open
      await this._transition(rfdIssueKey, RFDWOKFLOW.ACTION_961.name)
    }

    // if (doTransitionForSubtasks) {
    for (const rfdSubTask of rfdIssue.fields.subtasks) {
      await this._manageRfdAndSubtasksTransitionToInitialState(rfdSubTask.key)
    }
    // }
  }

  // Transition RFD post Deployment

  async transitionRFDpostDeployment(env: string) {
    // Jira settings

    // TOFIX: never used?
    // const jiraUrl = this.jiraSettings.url
    // const username = this.jiraSettings.username
    // const password = this.jiraSettings.password
    const rfcIssueKey = this.jiraSettings.rfcIssueKey

    // transition RFDs/Subtasks
    return this.transitionRfdAndSubtasksToResolved(rfcIssueKey, env)
  }

  async transitionRfdAndSubtasksToResolved(rfcIssueKey: string, env: string) {
    if (env === CONST.ENV.DLVR) {
      return this.transitionRfdAndSubtasksToResolvedOnTargetEnv(rfcIssueKey, CONST.JIRA_TARGET_ENV.DLVR)
    } if (env === CONST.ENV.TEST) {
      return this.transitionRfdAndSubtasksToResolvedOnTargetEnv(rfcIssueKey, CONST.JIRA_TARGET_ENV.TEST)
    } if (env === CONST.ENV.PROD) {
      return this.transitionRfdAndSubtasksToResolvedOnTargetEnv(rfcIssueKey, CONST.JIRA_TARGET_ENV.PROD)
    }
  }

  async _transitionRfdIssueToStatus(rfdIssue: any, finalStatus: any) {
    const RFD_LINEAR_FORWARD_WORKFLOW = [
      {status: RFDWOKFLOW.STATUS_SUBMITTED, action: RFDWOKFLOW.ACTION_881},
      {status: RFDWOKFLOW.STATUS_IN_REVIEW, action: RFDWOKFLOW.ACTION_721},
      {status: RFDWOKFLOW.STATUS_APPROVED, action: RFDWOKFLOW.ACTION_711},
      {status: RFDWOKFLOW.STATUS_SCHEDULED, action: RFDWOKFLOW.ACTION_4},
      {status: RFDWOKFLOW.STATUS_IN_PROGRESS, action: RFDWOKFLOW.ACTION_781},
      {status: RFDWOKFLOW.STATUS_RESOLVED, action: RFDWOKFLOW.ACTION_701},
    ]
    let transitionForward = false
    rfdIssue = await this.getIssue(rfdIssue.key)
    for (let index = 0; index < RFD_LINEAR_FORWARD_WORKFLOW.length; index++) {
      const status2 = RFD_LINEAR_FORWARD_WORKFLOW[index].status
      if (!transitionForward && rfdIssue.fields.status.id === status2.id) transitionForward = true
      if (transitionForward) {
        const action = RFD_LINEAR_FORWARD_WORKFLOW[index].action
        await this._transition(rfdIssue.key, action.name)
        rfdIssue.fields.status = action.to
      }
      if (rfdIssue.fields.status.id === finalStatus.id) {
        break
      }
    }
  }

  async transitionRfdAndSubtasksToResolvedOnTargetEnv(rfcIssueKey: string, jiraTargetEnv: string) {
    const onTargetEnvRfdIssueKeys = await this.getRfdTaskIds(rfcIssueKey, jiraTargetEnv)
    for (const rfdIssuekey of onTargetEnvRfdIssueKeys) {
      const rfdIssue = await this.getIssue(rfdIssuekey)
      for (const subTask of rfdIssue.fields.subtasks) {
        await this._transitionRfdIssueToStatus(subTask, RFDWOKFLOW.STATUS_RESOLVED)
      }
      await this._transitionRfdIssueToStatus(rfdIssue, RFDWOKFLOW.STATUS_RESOLVED)
    }
    return Promise.resolve(true)
  }

  async editIssue(issueKey: string, repoName: string, changeBranch: string) {
    const issueInfo = await this.getIssue(issueKey)
    if (issueInfo.fields.labels.includes('auto')) {
      // pass
    } else if (issueInfo.fields.labels.includes('repo') && issueInfo.fields.labels.includes('branch')) {
      // pass
    } else {
      const editIssuePayload = {
        issueKey: issueKey,
        issue: {
          update: {
            labels: [{add: `repo:${repoName}`}, {add: `branch:${changeBranch}`}],
          },
          properties: [],
        },
      }
      await this.jiraClient.issue.editIssue(editIssuePayload)
      console.log('Issue Label was successfully editted with issue key : ' + issueKey)
    }
    return Promise.resolve(true)
  }
} // end Jira class
