const nock = require('nock')

const RFCWORKFLOW = require('../lib/JiraRfcWorkflowV2.0.0')
const RFDWORKFLOW = require('../lib/JiraRfdWorkflowV1.2.2')
const WORKFLOWS = {RFD: RFDWORKFLOW, RFC: RFCWORKFLOW, 'RFD-subtask': RFDWORKFLOW}
const merge = require('lodash.merge')

class JiraMock {
  static createJiraClientSettings(overwrites) {
    return merge(
      {
        url: 'bwa.nrs.gov.bc.ca/int/jira',
        username: 'fake',
        password: 'fake',
      },
      overwrites || {},
    )
  }

  constructor(jira) {
    this.issues = new Map()
    this.links = []
    this.lastIssueId = 1000
    this.jira = jira
  }

  createRFC(issue) {
    return merge(
      {
        key: `FAKE-${this.lastIssueId++}`,
        fields: {
          fixVersions: ['0.0.0'],
          issuetype: {id: '10400', name: 'RFC'},
          issuelinks: [],
          status: RFCWORKFLOW.STATUS_IN_EVAL_FOR_INT,
        },
      },
      issue || {},
    )
  }

  patchIssue(issue, patch) {
    return merge(this.issues.get(issue.key), patch)
  }

  _getIssue(issueKey) {
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

  _linkIssues(link) {
    const self = this
    self.links.push(link)
    const issue1 = self.issues.get(link.inwardIssue.key)
    issue1.fields.issuelinks = issue1.fields.issuelinks || []
    // link.inwardIssue = issue1
    issue1.fields.issuelinks.push(link)
    const issue2 = self.issues.get(link.outwardIssue.key)
    issue2.fields.issuelinks = issue2.fields.issuelinks || []
    // link.outwardIssue = issue2
    issue2.fields.issuelinks.push(link)
    return link
  }

  _addIssue(issue) {
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
    const self = this
    nock('https://bwa.nrs.gov.bc.ca:443', {encodedQueryParams: true})
    .get(/\/int\/jira\/rest\/api\/2\/issue\/[^/]+$/)
    .reply(200, (uri, requestBody) => {
      const issueKey = uri.split('/')[7]
      const serializableIssue = this._getIssue(issueKey)
      // console.log(JSON.stringify(serializableIssue))
      return serializableIssue
    })
    .persist()
    nock('https://bwa.nrs.gov.bc.ca:443', {encodedQueryParams: true})
    .get(/\/int\/jira\/rest\/api\/2\/issue\/[^/]+\/transitions$/)
    .reply(200, (uri, requestBody) => {
      const issueKey = uri.split('/')[7]
      const issue = self.issues.get(issueKey)
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
    .reply(200, (uri, requestBody) => {
      const issueKey = uri.split('/')[7]
      const issue = self.issues.get(issueKey)
      const workflow = WORKFLOWS[issue.fields.issuetype.name]
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
    .reply(200, (uri, requestBody) => {
      const newIssue = Object.assign({}, requestBody)
      newIssue.fields = newIssue.fields || {}
      newIssue.fields.status = newIssue.fields.status || {...RFDWORKFLOW.INITIAL_STATUS}
      const newId = self.lastIssueId++
      newIssue.key = `FAKE-${newId}`
      self._addIssue(newIssue)
      return newIssue
    })
    .persist()

    nock('https://bwa.nrs.gov.bc.ca')
    .post('/int/jira/rest/api/2/issueLink')
    .reply(200, (uri, requestBody) => {
      return this._linkIssues(requestBody)
    })
    .persist()
  }
}
exports.RFCWORKFLOW = RFCWORKFLOW
exports.RFDWORKFLOW = RFDWORKFLOW
exports.WORKFLOWS = WORKFLOWS
exports.JiraMock = JiraMock
