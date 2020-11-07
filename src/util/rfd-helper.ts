// JIRA REST API - https://docs.atlassian.com/software/jira/docs/api/REST/8.5.3/
import {AxiosFactory} from '../api/service/axios-factory'
import * as RFD from './jira-rfd-workflow-v1.2.2'
import * as RFC from './jira-rfc-workflow-v2.0.0'
import merge from 'lodash.merge'
import {DeploymentArgument, StartDeploymentArgument, Issue, IssueResolution, ProjectReference, PullRequestReference, IssueStatus, NameAndId} from '../api/model/jira'
import {AxiosBitBucketClient} from '../api/service/axios-bitbucket-client'
import {GeneralError} from '../error'
import {ValidationError} from '../validation-error'

export interface CreateRfdParameters {
  rfc: Issue;
  issue: Issue;
  pullRequest: PullRequestReference;
  targetEnvironment: string | string[];
}

export class RfdHelper {
  settings: any;

  constructor(settings: any) {
    this.settings = settings
  }

  async createJiraClient() {
    return AxiosFactory.jira()
  }

  async createVersion(param: { project: any; name: any}) {
    const jira = await this.createJiraClient()
    return jira.client.post('/rest/api/2/version', param).then(response => {
      return response.data
    })
  }

  async closeRFD(issue: Issue, resolution: IssueResolution) {
    const jira = await this.createJiraClient()
    if (issue?.fields?.status?.id === RFD.STATUS_RESOLVED.id) {
      await jira.transitionIssue({issueIdOrKey: issue.key as string, transition: {id: RFD.ACTION_701.id}, fields: {resolution: resolution}})
    } else {
      await jira.transitionIssue({issueIdOrKey: issue.key as string, transition: {id: RFD.ACTION_921.id}})
    }
  }

  async getComponent({project, pullRequest, create}: {project: ProjectReference; pullRequest: PullRequestReference; create?: boolean}) {
    const jira = await this.createJiraClient()
    return jira.client.get(`/rest/api/2/project/${project?.key}/components`)
    .then(response => {
      const pullRequestRepository = AxiosBitBucketClient.parseUrl(pullRequest.repository.url as string)
      for (const component of response.data) {
        try {
          const repository = AxiosBitBucketClient.parseUrl(component.description)
          if (repository) {
            if (pullRequestRepository.slug.toUpperCase() === repository.slug.toUpperCase() && pullRequestRepository.project.key.toUpperCase() === repository.project.key.toUpperCase()) {
              return {name: component.name, id: component.id}
            }
          }
        } catch (error) {
          // do nothing. An parsing error means that it is not a link to a repositoty.
        }
      }
      if (create !== true) throw new Error(`Jira Component not found for ${pullRequest.repository.url}`)
      return jira.client.post('/rest/api/2/component', {project: project.key, name: pullRequestRepository.slug, description: pullRequest.repository.url})
      .then(response => {
        return {name: response.data.name, id: response.data.id}
      })
    })
    .catch(error => {
      throw error
    })
  }

  async _transitionForward(issue: Issue, status: IssueStatus, transitions: any[]): Promise<Issue> {
    if (!issue.fields?.status?.name) throw new Error('Issue field.status.name cannot be null/undefined')
    if (issue.fields?.status?.name === status.name) return issue
    let found = false
    const jira = await this.createJiraClient()
    const _fifo = [...transitions]
    // Iterate over ordered list of transitions
    // When in notfound mode found and current transition is the one that would take to current status, flip to `found` mode
    // When in found mode, do transition for each remaining transition in the ordered list
    while (_fifo.length > 0) {
      const transition = _fifo.shift()
      if (found === true) {
        const message = `transitioning issue ${issue.fields.issuetype?.name}/${issue.key} from state '${issue.fields?.status?.name}' to '${transition?.to?.name}' using '${transition.name}' transition trying to get to ${status.name}`
        // eslint-disable-next-line no-console
        // console.log(message)

        // eslint-disable-next-line no-await-in-loop
        await jira.transitionIssue({issueIdOrKey: issue.key as string, transition: transition})
        .then(result => {
          if (issue?.fields?.status) {
            // update  status
            issue.fields.status = result.fields.status as NameAndId
          }
        })
        .catch(error => {
          // eslint-disable-next-line no-console
          // console.dir(transitions)
          throw new GeneralError(`Error ${message}\n${JSON.stringify(error.response.data)}`, error)
        })

        // it may fast forward to resulting status (e.: auto approvals)
        // skip any intermediate states
        // while (_fifo.length > 0 && _fifo[0].to.name !== issue.fields.status?.name) {
        //   _fifo.shift()
        // }
        // skip current state (since we are already in it)
        if (_fifo.length > 0 && _fifo[0].to.name === issue.fields.status?.name) {
          _fifo.shift()
        }
        if (issue?.fields?.status?.name === status.name) {
          break
        }
        if (_fifo.length > 0 && issue.fields.issuetype?.name === 'RFD' && transition.id === RFD.ACTION_881.id) {
          // if this is an RFD that got to 'START REVIEW', and there is more actions left, we need to advance RFD-subtaks before continuing
          const jql = `issuetype = "RFD-subtask"  AND status != "Closed" AND parent = "${issue.key}"`
          // eslint-disable-next-line no-await-in-loop
          await jira.search({
            fields: 'fixVersions,issuetype,project,status,labels',
            jql: jql,
          })
          .then(async result => {
            for (const issue of result.issues) {
              // eslint-disable-next-line no-await-in-loop
              await this.transitionRFDSubtaskForward(issue, _fifo[0].to)
            }
            await jira.getIssue(issue.key as string, {fields: 'status'})
            .then(updatedIssue => {
              merge(issue.fields, updatedIssue.fields)
              // if the subtasks caused the parent task to get to the next state, skip to next
              if (_fifo[0].to.name === updatedIssue.fields.status.name) {
                _fifo.shift()
              }
            })
          })
          .catch(error => {
            throw new GeneralError('Error fetching RFD-subtasks', error)
          })
        }
        // yes, check again because transioning sub-tasks may have update the parent task
        if (issue?.fields?.status?.name === status.name) {
          break
        }
      } else if (issue.fields?.status?.name === transition.to.name) {
        found = true
      }
    }
    return issue
  }

  async transitionRFCForward(issue: Issue, status: IssueStatus): Promise<Issue> {
    const transitions = [
      {to: RFC.STATUS_OPEN},
      RFC.ACTION_21,
      RFC.ACTION_31,
      RFC.ACTION_71,
      RFC.ACTION_81,
    ]
    return this._transitionForward(issue, status, transitions)
  }

  async transitionRFDForward(issue: Issue, status: IssueStatus): Promise<Issue> {
    const transitions = [
      {to: RFD.STATUS_OPEN},
      RFD.ACTION_731,
      RFD.ACTION_881,
      RFD.ACTION_721,
      RFD.ACTION_711,
      RFD.ACTION_4,
      RFD.ACTION_781,
      RFD.ACTION_701,
    ]
    return this._transitionForward(issue, status, transitions)
  }

  async transitionRFDSubtaskForward(issue: Issue, status: IssueStatus): Promise<Issue> {
    // for now, it is the same as RFD
    return this.transitionRFDForward(issue, status)
  }

  async _createRFDSubtask(params: {rfd: Issue; pullRequest: PullRequestReference; targetEnv: string}) {
    const jira = await this.createJiraClient()
    const component = await this.getComponent({project: params.rfd.fields?.project as ProjectReference, pullRequest: params.pullRequest, create: true})

    return jira.search({
      fields: 'fixVersions,issuetype,project,status,labels',
      jql: `issuetype = "RFD-subtask"  AND status  != "Closed" AND "Target environment" = "${params.targetEnv}" AND parent = "${params.rfd.key}" AND component = "${component.name}"`,
    })
    .then(async result => {
      let openRFD: Issue | null = null
      for (const issue of result.issues as Issue[]) {
        if (issue.fields?.status?.id === RFD.STATUS_OPEN.id) {
          openRFD = issue
        } else {
        // eslint-disable-next-line no-await-in-loop
          await this.closeRFD(issue, {name: 'Duplicate'})
        }
      }
      return openRFD
    })
    .then(async result => {
      if (!result) {
        const issueSpec = merge({}, {
          fields: {
            parent: {key: params.rfd.key},
            project: params.rfd?.fields?.project,
            summary: `Deploy ${params.pullRequest.repository.slug}`,
            issuetype: {name: 'RFD-subtask'},
            fixVersions: params.rfd?.fields?.fixVersions,
            labels: params.rfd?.fields?.labels,
            components: [component],
            customfield_10121: {value: params.targetEnv.toUpperCase()},
          },
        })
        return jira.createIssue(issueSpec)
        .catch(error => {
          throw new GeneralError(`Error creating RFD-subtask:\n${JSON.stringify(issueSpec)}`, error)
        })
      }
      return result
    })
    .catch(error => {
      throw new GeneralError('Error creating RFD-subtask', error)
    })
  }

  async getRfcByIssue(key: string) {
    const jira = await this.createJiraClient()
    return jira.getRfcByIssue(key)
  }

  async _createRFD({rfc, issue, pullRequest, targetEnvironment}: CreateRfdParameters) {
    if (!issue?.fields?.project?.key) throw new Error('Missing issue "fields.project.key" field')
    if (!issue?.fields?.summary) throw new Error('Missing issue "fields.summary" field')
    if (!issue?.fields?.description) throw new Error('Missing issue "fields.description" field')

    const jira = await this.createJiraClient()
    const targetEnvironments: string[] = []
    if (Array.isArray(targetEnvironment)) {
      targetEnvironments.push(...targetEnvironment)
    } else {
      targetEnvironments.push(targetEnvironment)
    }
    const issues: Issue[] = []
    for (const targetEnv of targetEnvironments) {
      // Find RFD linked to pull-request and environment
      // eslint-disable-next-line no-await-in-loop
      await jira.search({
        fields: 'fixVersions,issuetype,project,status,labels',
        jql: `issuetype = "RFD"  and status  != "Closed" and "Target environment" = "${targetEnv}" and issueFunction in linkedIssuesOfRemote("${pullRequest.url}")`,
      })
      .then(async result => {
        let openRFD: Issue | null = null
        for (const issue of result.issues as Issue[]) {
          if (issue.fields?.status?.id === RFD.STATUS_OPEN.id) {
            openRFD = issue
          } else {
          // eslint-disable-next-line no-await-in-loop
            await this.closeRFD(issue, {name: 'Duplicate'})
          }
        }
        return openRFD
      })
      .then(async result => {
        if (result === null) {
          const defaultIssue: Issue = {
            fields: {
              issuetype: {name: 'RFD'},
              description: 'Something important that needs to be done',
            },
          }
          merge(defaultIssue, issue)
          return jira.createIssue(defaultIssue).then(response => {
            return merge(response, defaultIssue, {fields: {status: RFD.STATUS_OPEN}}) as Issue
          })
          .catch(error => {
            throw new GeneralError('Error creating RFD', error)
          })
        }
        return result as Issue
      })
      .then(async rfd => {
      // Link RFD to RFC
        await jira.createIssueLink({
          type: {name: 'RFC-RFD'},
          inwardIssue: {key: rfc.key},
          outwardIssue: {key: rfd.key as string},
        })
        .catch(error => {
          throw new GeneralError('Error creating RFC-RFD link', error)
        })
        // Add Pull Request web link to RFD
        await jira.createIssueRemoteWebLink(rfd, {url: pullRequest.url, title: `Pull Request #${pullRequest.number}`})
        .catch(error => {
          throw new GeneralError('Error creating Pull Request remote link', error)
        })
        // Create RFD Subtask
        const subtask = await this._createRFDSubtask({rfd, pullRequest, targetEnv})
        issues.push(...[rfc, rfd, subtask])
      })
    } // end for targetEnvironments
    return issues
  }

  async createDeployments(param: DeploymentArgument) {
    const jira = await this.createJiraClient()
    const rfc = await jira.getRfcByIssue(param?.issue?.key as string)
    // console.log(rfc.key)
    // return rfc
    // Retrieve RFC

    // if an open RFD is found, close it
    // create RFD
    return this._createRFD({
      rfc, issue: {
        fields: {
          project: {key: rfc.fields.project.key},
          summary: `Deployment PR-${param.pullRequest.number} to ${param.targetEnvironment}`,
          description: `Deployment PR-${param.pullRequest.number} to ${param.targetEnvironment}`,
          customfield_10121: {value: param.targetEnvironment.toUpperCase()},
        },
      },
      pullRequest: param.pullRequest,
      targetEnvironment: param.targetEnvironment,
    })
  }

  async deploymentStarted(param: StartDeploymentArgument) {
    // const jira = await this.createJiraClient()
    const issues = await this.createDeployments(param)
    if (!param.errors) param.errors = []
    // Check if RFDs have been approved
    for (const issue of issues) {
      if (issue.fields?.issuetype?.name === 'RFD') {
        if (!(issue.fields?.status?.id === RFD.STATUS_APPROVED.id || issue.fields?.status?.id === RFD.STATUS_SCHEDULED.id || issue.fields?.status?.id === RFD.STATUS_APPROVED.id)) {
          param.errors.push({cause: `${issue.fields?.issuetype?.name} '${issue.key}' is currently in '${issue.fields?.status?.name}' state but expected to be in '${RFD.STATUS_APPROVED.name}', '${RFD.STATUS_SCHEDULED.name}', or '${RFD.STATUS_APPROVED.name}'`})
        }
      } else if (issue.fields?.issuetype?.name === 'RFC') {
        if (!(issue.fields?.status?.id === RFC.STATUS_APPROVED.id)) {
          param.errors.push({cause: `RFC '${issue.key}' is currently in '${issue.fields?.status?.name}' state but expected to be in '${RFC.STATUS_APPROVED.name}'`})
        }
      }
    }
    if (param.errors.length > 0) {
      throw new ValidationError('One or more error was found', param.errors)
    }
    return issues
  }

  async deploymentFailed(_rfcIssueKey: string) {
    // no-op
  }

  async deploymentSuccessful(_rfcIssueKey: string) {
    // no-op
  }
}
