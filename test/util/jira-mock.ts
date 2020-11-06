const nock = require('nock')

import RfdWorkflow  from '../../src/util/jira-rfd-workflow-v1.2.2'
import RfcWorkflow from '../../src/util/jira-rfc-workflow-v2.0.0'

export const RFCWORKFLOW = RfcWorkflow
export const RFDWORKFLOW = RfdWorkflow

export const WORKFLOWS: { [key: string]: any} = {RFD: RFDWORKFLOW, RFC: RFCWORKFLOW, 'RFD-subtask': RFDWORKFLOW}
const merge = require('lodash.merge')

export class JiraMock {
  lastIssueId: number

  issues: Map<any, any>

  links: any[]

  static createJiraClientSettings(overwrites?: any) {
    return merge(
      {
        url: 'bwa.nrs.gov.bc.ca/int/jira',
        username: 'fake',
        password: 'fake',
      },
      overwrites || {}
    )
  }

  constructor(_jira?: any) {
    this.issues = new Map()
    this.links = []
    this.lastIssueId = 1000
  }

  createRFC(issue?: any) {
    return merge(
      {
        key: `FAKE-${this.lastIssueId++}`,
        fields: {
          fixVersions: ['0.0.0'],
          issuetype: {id: '10400', name: 'RFC'},
          issuelinks: [],
          status: RFCWORKFLOW.STATUS_SUBMIT,
        },
      },
      issue || {}
    )
  }

  patchIssue(issue: any, patch: any) {
    return merge(this.issues.get(issue.key), patch)
  }

  _getIssue(issueKey: string) {
    const issue = Object.assign({}, this.issues.get(issueKey))
    issue.fields = Object.assign({}, issue.fields)
    const resolvedIssueLinks = []
    for (const issueLink of issue.fields.issuelinks) {
      const newIssueLink = Object.assign({}, issueLink)
      if (!newIssueLink.inwardIssue.fields) {
        newIssueLink.inwardIssue = Object.assign({}, this.issues.get(issueLink.inwardIssue.key))
        newIssueLink.inwardIssue.fields = Object.assign({}, newIssueLink.inwardIssue.fields)
        delete newIssueLink.inwardIssue.fields.issuelinks
        delete newIssueLink.inwardIssue.fields.subtasks
      }
      if (!newIssueLink.outwardIssue.fields) {
        newIssueLink.outwardIssue = Object.assign({}, this.issues.get(issueLink.outwardIssue.key))
        newIssueLink.outwardIssue.fields = Object.assign({}, newIssueLink.outwardIssue.fields)
        delete newIssueLink.outwardIssue.fields.issuelinks
        delete newIssueLink.outwardIssue.fields.subtasks
      }
      resolvedIssueLinks.push(newIssueLink)
    }
    issue.fields.issuelinks = resolvedIssueLinks
    return issue
  }

  _linkIssues(link: any) {
    this.links.push(link)
    const issue1 = this.issues.get(link.inwardIssue.key)
    issue1.fields.issuelinks = issue1.fields.issuelinks || []
    // link.inwardIssue = issue1
    issue1.fields.issuelinks.push(link)
    const issue2 = this.issues.get(link.outwardIssue.key)
    issue2.fields.issuelinks = issue2.fields.issuelinks || []
    // link.outwardIssue = issue2
    issue2.fields.issuelinks.push(link)
    return link
  }

  _addIssue(issue: any) {
    if (Array.isArray(issue)) {
      for (const iss of issue) {
        this._addIssue(iss)
      }
      return issue
    }
    issue.fields = issue.fields || {}
    issue.fields.subtasks = issue.fields.subtasks || []
    issue.fields.issuelinks = issue.fields.issuelinks || []
    this.issues.set(issue.key, issue)
    return issue
  }

  start() {
    nock('https://bwa.nrs.gov.bc.ca:443', {encodedQueryParams: true})
    .get(/\/int\/jira\/rest\/api\/2\/issue\/[^/]+$/)
    .reply(200, (uri: string) => {
      const issueKey = uri.split('/')[7]
      const serializableIssue = this._getIssue(issueKey)
      // console.log(JSON.stringify(serializableIssue))
      return serializableIssue
    })
    .persist()
    nock('https://bwa.nrs.gov.bc.ca:443', {encodedQueryParams: true})
    .get(/\/int\/jira\/rest\/api\/2\/issue\/[^/]+\/transitions$/)
    .reply(200, (uri: string) => {
      const issueKey = uri.split('/')[7]
      const issue = this.issues.get(issueKey)
      const workflow = WORKFLOWS[issue.fields.issuetype.name]
      const transitions = {
        expand: 'transitions',
        transitions: workflow.getTransitionsByStatusId(issue.fields.status.id),
      }
      return transitions
    })
    .persist()
    nock('https://bwa.nrs.gov.bc.ca:443', {encodedQueryParams: true})
    .post(/\/int\/jira\/rest\/api\/2\/issue\/[^/]+\/transitions$/)
    .reply(200, (uri: string, requestBody: any) => {
      const issueKey = uri.split('/')[7]
      const issue = this.issues.get(issueKey)
      const workflow = WORKFLOWS[issue.fields.issuetype.name as string] as any
      const newTransition = workflow.getTransitionById(requestBody.transition.id)
      Object.assign(issue.fields.status, newTransition.to)
    })
    .persist()

    nock('https://bwa.nrs.gov.bc.ca')
    .get('/int/jira/rest/api/2/project/FAKE')
    .reply(200, {
      components: [{name: 'FAKE'}],
    })
    .persist()
    nock('https://bwa.nrs.gov.bc.ca')
    .post('/int/jira/rest/api/2/issue')
    .reply(200, (uri: string, requestBody: any) => {
      const newIssue = Object.assign({}, requestBody)
      newIssue.fields = newIssue.fields || {}
      newIssue.fields.status = newIssue.fields.status || {...RFDWORKFLOW.INITIAL_STATUS}
      const newId = this.lastIssueId++
      newIssue.key = `FAKE-${newId}`
      this._addIssue(newIssue)
      return newIssue
    })
    .persist()

    nock('https://bwa.nrs.gov.bc.ca')
    .post('/int/jira/rest/api/2/issueLink')
    .reply(200, (uri: string, requestBody: any) => {
      return this._linkIssues(requestBody)
    })
    .persist()
  }
}
