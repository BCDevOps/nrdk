import * as MochaNockBack from './mocha-nock-back'
import * as Jira from 'jira.js'
import * as path from 'path'
import * as fs from 'fs'
import merge from 'lodash.merge'
import RfcWorkflow from '../../src/util/jira-rfc-workflow-v2.0.0'
import * as RfdWorkflow from '../../src/util/jira-rfd-workflow-v1.2.2'
const JIRA_PROJECT = 'ONETEAM'
const TEST_CASE_LABEL = 'bba9b69c-666e-4852-a63c-9a4b18386347'
const TEST_CASE_USERNAME1 = 'CVARJAO'
const TEST_CASE_USERNAME2 = 'NRCDA001'
const RFC_CHANGE_SPONSOR = TEST_CASE_USERNAME1
const RFC_CHANGE_COORDINATOR = TEST_CASE_USERNAME2
const SCHEDULE_DATE = '2020-11-05T06:16:26.463-0000'

import * as chai from 'chai'
import {Context} from 'mocha'

function loadJiraClientConfig(): Jira.Config {
  const configFile = path.resolve(__dirname, '../.local/jira-config.json')
  const defaultConfig = require(path.resolve(__dirname, '../default.jira-config.json'))
  let localConfig: any = {}
  if (process.env.NOCK_BACK_MODE !== 'lockdown' && fs.existsSync(configFile)) {
    localConfig = require(configFile)
  }
  return merge({}, defaultConfig, localConfig)
}

async function clearVersion(jira: Jira.Client) {
  await jira.projectVersions.getProjectVersions({projectIdOrKey: JIRA_PROJECT})
  .then(async versions => {
    for (const version of versions) {
      if (version.name === TEST_CASE_LABEL) {
        // eslint-disable-next-line no-await-in-loop
        await jira.projectVersions.deleteVersion({id: version.id})
        break
      }
    }
  })
}
describe('jira:workflow @type=system', () => {
  let rfc: any = null
  const jira = new Jira.Client(loadJiraClientConfig())
  // beforeEach(MochaNockBack.beforeEach())
  // afterEach(MochaNockBack.afterEach)

  before(async function (this: Context) {
    if (process.env.NOCK_BACK_MODE === 'lockdown') return Promise.resolve(true)
    MochaNockBack.afterEach.call(this)
    clearVersion(jira)
  })

  after(async function (this: Context) {
    // (this.currentTest as any).nockDone()
    if (process.env.NOCK_BACK_MODE === 'lockdown') return Promise.resolve(true)
    await jira.issueSearch.searchForIssuesUsingJqlGet({jql: 'labels = bba9b69c-666e-4852-a63c-9a4b18386347', fields: ['key'], maxResults: 100})
    .then(async result => {
      for (const issue of result.issues) {
        // eslint-disable-next-line no-await-in-loop
        await jira.issues.deleteIssue({issueIdOrKey: issue.key, deleteSubtasks: 'true'})
      }
    })
    clearVersion(jira)
  })

  describe('RFC', () => {
    beforeEach(MochaNockBack.beforeEach())
    afterEach(MochaNockBack.afterEach)
    it('empty', async () => {
      return jira.issues.createIssue({
        fields: {
          project: {key: JIRA_PROJECT},
          issuetype: {name: 'RFC'},
          labels: [TEST_CASE_LABEL],
        },
      })
      .then(() => {
        throw new Error('Was not supposed to succeed')
      })
      .catch(error => {
        chai.expect(error.response.status).eql(400)
        // chai.expect(error.response.data.errors).to.have.lengthOf(7)
        chai.expect(error.response.data.errors).eql({
          summary: 'You must specify a summary of the issue.',
          customfield_10117: 'High Level Technical Deliverables is required.',
          customfield_10119: 'Change Sponsor is required.',
          customfield_10637: 'Change Coordinator is required.',
          customfield_11300: 'Likelihood is required.',
          customfield_11301: 'Impact is required.',
          customfield_10103: 'RFC Category is required.',
        })
      })
    })

    it('minimal', async () => {
      return jira.issues.createIssue({
        fields: {
          project: {key: JIRA_PROJECT},
          issuetype: {name: 'RFC'},
          labels: [TEST_CASE_LABEL],
          summary: `TEST RFC - ${TEST_CASE_LABEL}`,
          description: 'Something important that needs to be done',
          customfield_10117: 'Something', // High Level Technical Deliverables
          customfield_10119: {name: RFC_CHANGE_SPONSOR}, // Change Sponsor
          customfield_10637: {name: RFC_CHANGE_COORDINATOR}, // Change Coordinator
          customfield_11300: {value: 'Low', id: '11300'}, // Likelihood
          customfield_11301: {value: 'Low', id: '11303'}, // Impact
          customfield_10103: {id: '10130', value: 'Infrastructure Change'}, // RFC Category
          customfield_12202: {value: 'Yes'}, // Automated/Pipeline
        },
      })
      .then(issue => {
        chai.expect(issue).to.have.own.property('id')
        chai.expect(issue).to.have.own.property('key')
        rfc = issue
      })
      .catch(error => {
        throw error
      })
    })
  })
  describe('RFD', () => {
    let version: any = null
    let rfd: any = null
    let rfdSubtask: any = null

    beforeEach(MochaNockBack.beforeEach())
    afterEach(MochaNockBack.afterEach)
    it('open-rfc', async () => {
      chai.expect(rfc).to.not.be.null
      chai.expect(rfc).to.have.own.property('id')
      chai.expect(rfc).to.have.own.property('key')
      const rfcIssue = await jira.issue.getIssue({issueIdOrKey: rfc.key})
      chai.expect(rfcIssue.fields.issuetype.name).to.be.equal('RFC')
      chai.expect(rfcIssue.fields.status.name).to.be.equal(RfcWorkflow.STATUS_OPEN.name)
      chai.expect(rfcIssue.fields.status.id).to.be.equal(RfcWorkflow.STATUS_OPEN.id)
      // eslint-disable-next-line no-console
      console.log(`      RFC -> ${rfc.key}`)
    })
    it('update-reporter', async () => {
      chai.expect(rfc).to.not.be.null
      await jira.issues.editIssue({issueIdOrKey: rfc.key, notifyUsers: false, fields: {reporter: {name: RFC_CHANGE_COORDINATOR}, customfield_12202: {value: 'Yes'}}})
      .then(result => {
        chai.expect(result).to.be.eql('')
      })
      .catch(error => {
        throw error
      })
    })
    it('approve-rfc', async () => {
      chai.expect(rfc).to.not.be.null
      const rfcIssue = await jira.issue.getIssue({issueIdOrKey: rfc.key})
      chai.expect(rfcIssue.fields.issuetype.name).to.be.equal('RFC')
      chai.expect(rfcIssue.fields.status.name).to.be.equal(RfcWorkflow.STATUS_OPEN.name)
      chai.expect(rfcIssue.fields.status.id).to.be.equal(RfcWorkflow.STATUS_OPEN.id)
      await jira.issues.transitionIssue({issueIdOrKey: rfcIssue.key, transition: RfcWorkflow.ACTION_21})
      .then(result => {
        chai.expect(result).to.be.eql('')
      })
      .catch(error => {
        chai.expect(error).to.be.eql({})
      })
    })
    it('create-version', async () => {
      chai.expect(rfc).to.not.be.null
      jira.issueLinks.createIssueLink()
      return jira.projectVersions.createVersion({project: JIRA_PROJECT, name: TEST_CASE_LABEL})
      .then(result => {
        chai.expect(result).to.have.own.property('id')
        chai.expect(result).to.have.own.property('name')
        version = {id: result.id, name: result.name}
      })
      .catch(error => {
        throw error
      })
    })
    it('create-rfd', async () => {
      chai.expect(rfc).to.not.be.null
      await jira.issues.createIssue({
        fields: {
          project: {key: JIRA_PROJECT},
          issuetype: {name: 'RFD'},
          labels: [TEST_CASE_LABEL],
          summary: `TEST RFD - ${TEST_CASE_LABEL}`,
          fixVersions: [version],
          customfield_10121: {value: 'DLVR'}, // Target Environment
        },
      })
      .then(result => {
        rfd =  result
        if (result.self) delete result.self
      })
      .catch(error => {
        throw error
      })
    })
    it('create-rfd-subtask', async () => {
      chai.expect(rfc).to.not.be.null
      await jira.issues.createIssue({
        fields: {
          project: {key: JIRA_PROJECT},
          parent: rfd,
          issuetype: {name: 'RFD-subtask'},
          labels: [TEST_CASE_LABEL],
          summary: `TEST RFD-Subtask - ${TEST_CASE_LABEL}`,
          fixVersions: [version],
          customfield_10121: {value: 'DLVR'}, // Target Environment
        },
      })
      .then(result => {
        rfdSubtask =  result
        if (result.self) delete result.self
        chai.expect(rfdSubtask).to.not.be.null
      })
      .catch(error => {
        throw error
      })
    })
    it('rfd:submit', async () => {
      chai.expect(rfc).to.not.be.null
      await jira.issues.transitionIssue({issueIdOrKey: rfd.key, transition: RfdWorkflow.ACTION_731})
    })
    it('rfd:start-review', async () => {
      chai.expect(rfc).to.not.be.null
      await jira.issues.transitionIssue({issueIdOrKey: rfd.key, transition: RfdWorkflow.ACTION_881})
    })
    it('rfdsubtask:start-review', async () => {
      chai.expect(rfc).to.not.be.null
      await jira.issues.transitionIssue({issueIdOrKey: rfdSubtask.key, transition: RfdWorkflow.ACTION_881})
    })
    it('rfdsubtask:approve', async () => {
      await jira.issues.transitionIssue({issueIdOrKey: rfdSubtask.key, transition: RfdWorkflow.ACTION_721})
    })
    it('rfd:schedule', async () => {
      chai.expect(rfc).to.not.be.null
      // new Date().toISOString().slice(0, -1) + '-0000'
      await jira.issues.transitionIssue({issueIdOrKey: rfd.key, transition: RfdWorkflow.ACTION_711, fields: {customfield_10636: SCHEDULE_DATE}})
      .catch(error => {
        throw error
      })
    })
    it('rfd:start-progress', async () => {
      chai.expect(rfc).to.not.be.null
      await jira.issues.transitionIssue({issueIdOrKey: rfd.key, transition: RfdWorkflow.ACTION_4})
      .catch(error => {
        throw error
      })
    })
    it('rfdsubtask:start-progress', async () => {
      chai.expect(rfc).to.not.be.null
      await jira.issues.transitionIssue({issueIdOrKey: rfdSubtask.key, transition: RfdWorkflow.ACTION_4})
      .catch(error => {
        throw error
      })
    })
    it('rfdsubtask:resolve', async () => {
      chai.expect(rfc).to.not.be.null
      await jira.issues.transitionIssue({issueIdOrKey: rfdSubtask.key, transition: RfdWorkflow.ACTION_781})
      .catch(error => {
        throw error
      })
    })
    it('rfd:resolved', async () => {
      chai.expect(rfc).to.not.be.null
      await jira.issue.getIssue({issueIdOrKey: rfd.key})
      .then(async result => {
        chai.expect(result.fields.status.id).to.be.equal(RfdWorkflow.STATUS_RESOLVED.id)
      })
    })
    it('rfd:re-open', async () => {
      chai.expect(rfc).to.not.be.null
      await jira.issues.transitionIssue({issueIdOrKey: rfdSubtask.key, transition: RfdWorkflow.ACTION_961})
      .catch(error => {
        throw error
      })
    })
  })
})
