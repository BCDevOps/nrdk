import * as MochaNockBack from './mocha-nock-back'
import {CreateRfdParameters, RfdHelper} from '../../src/util/rfd-helper'
import {SecretManager} from '../../src/api/service/secret-manager'
import {createRFC, cleanUpTestCase} from './jira-util'
import Sinon from 'sinon'
import merge from 'lodash.merge'
import {expect} from 'chai'
import {AxiosBitBucketClient} from '../../src/api/service/axios-bitbucket-client'
import * as RFCwkf from '../../src/util/jira-rfc-workflow-v2.0.0'
import * as RFDwkf from '../../src/util/jira-rfd-workflow-v1.2.2'
import {Issue, IssueTypeNames} from '../../src/api/model/jira'

import {extend as jest_extend} from 'expect'
import {toMatchSnapshot} from './expect-mocha-snapshot'
import {LoggerFactory} from '../../src/util/logger'
jest_extend({toMatchSnapshot})

const TEST_SUITE_ID = '7c1ae584e9b6'
const TEST_CASE_JIRA_PROJECT = 'SAMPLE'
const TEST_CASE_USERNAME1 = 'CVARJAO'
const TEST_CASE_USERNAME2 = 'NRCDA001'
const RFC_CHANGE_SPONSOR = TEST_CASE_USERNAME1
const RFC_CHANGE_COORDINATOR = TEST_CASE_USERNAME2
const sandbox = Sinon.createSandbox()

let pullRequestNumber = 1

// const LOGGER = LoggerFactory.createLogger(__filename)
/**
 * This is a System testing case which requires access to an JIRA installation
 */
describe('jira:workflow @type=system', () => {
  const  helper = new RfdHelper({})
  before(() => {
    // eslint-disable-next-line node/no-missing-require
    SecretManager.loadEntries(require('../.local/secrets.json'))
  })
  before(async function () {
    LoggerFactory.ROOT.level = 'info'
    // LoggerFactory.setRootLevel('debug')
    // LoggerFactory.ROOT.debug('hello - debug')
    if (process.env.NOCK_BACK_MODE === 'lockdown') return Promise.resolve(true)
    MochaNockBack.afterEach.call(this)
    await cleanUpTestCase(await helper.createJiraClient(), TEST_SUITE_ID, TEST_CASE_JIRA_PROJECT)
  })

  after(async function () {
    // LoggerFactory.ROOT.level = 'INFO'
    if (process.env.NOCK_BACK_MODE === 'lockdown') return Promise.resolve(true)
    MochaNockBack.afterEach.call(this)
    // await cleanUpTestCase(await helper.createJiraClient(), TEST_SUITE_ID, TEST_CASE_JIRA_PROJECT)
  })

  describe('e2e', () => {
    beforeEach(MochaNockBack.beforeEach())
    afterEach(MochaNockBack.afterEach)
    beforeEach(() => {
      sandbox.restore()
    })
    it('re-start deployments to multiple environments: dlvr, test, prod', async () => {
      const TEST_CASE_ID = 'run-d0b4e6cf'
      pullRequestNumber++
      const _version = await helper.createVersion({project: TEST_CASE_JIRA_PROJECT, name: `${TEST_SUITE_ID}-${TEST_CASE_ID}`})
      const stubCreateRFD = sandbox.stub(helper, '_createRFD').callsFake((params: CreateRfdParameters) => {
        merge(params.issue, {fields: {labels: [TEST_SUITE_ID, TEST_CASE_ID], fixVersions: [_version]}})
        return stubCreateRFD.wrappedMethod.bind(helper)(params)
      })
      const jira = await helper.createJiraClient()
      const targetEnvironments = ['dlvr', 'test', 'prod']
      const rfc = await createRFC(jira, {
        fields: {
          project: {key: TEST_CASE_JIRA_PROJECT},
          summary: `TEST RFC - ${TEST_SUITE_ID}/${TEST_CASE_ID}`,
          labels: [TEST_SUITE_ID, TEST_CASE_ID],
          customfield_10119: {name: RFC_CHANGE_SPONSOR}, // Change Sponsor
          customfield_10637: {name: RFC_CHANGE_COORDINATOR}, // Change Coordinator
          fixVersions: [_version],
        },
      })
      if (!rfc.fields) rfc.fields = {}
      rfc.fields.status = RFCwkf.STATUS_OPEN
      await helper.transitionRFCForward(rfc, RFCwkf.STATUS_APPROVED)
      const keys1: any[] = []
      const pullRequestRef = {
        url: `https://apps.nrs.gov.bc.ca/int/stash/projects/FAKE/repos/fake/pull-requests/${pullRequestNumber}/overview`,
        number: `${pullRequestNumber}`,
        sourceBranch: `release/${rfc.key}`,
        targetBranch: 'master',
        repository: AxiosBitBucketClient.parseUrl(`https://bwa.nrs.gov.bc.ca/int/stash/scm/FAKE/${TEST_SUITE_ID}-A.git`),
      }

      await helper.createDeployments({
        issue: {key: rfc.key},
        pullRequest: pullRequestRef,
        targetEnvironment: targetEnvironments,
      })
      .then(async issues => {
        // all but the last one is in resolved state
        // eslint-disable-next-line max-nested-callbacks
        const rfds = issues.filter(item => item?.fields?.issuetype?.name === IssueTypeNames.RFD)
        // Transition all RFDs to Approved
        for (const issue of rfds) {
          // eslint-disable-next-line no-await-in-loop
          await helper.transitionRFDForward(issue, RFDwkf.STATUS_APPROVED)
        }
        let previousRFD = null
        for (const issue of rfds.slice(0, -1)) {
          const targetEnvironment = issue?.fields?.customfield_10121?.value as string
          // eslint-disable-next-line no-await-in-loop
          let result = await helper.deploymentStarted({
            issue: issue,
            pullRequest: pullRequestRef,
            targetEnvironment: targetEnvironment,
          })
          if (previousRFD === null) {
            expect(result.errors).to.have.lengthOf(0)
          } else {
            // expects it to fail as RFD to previous environment needs to be Closed
            expect(result.errors).to.have.lengthOf(1)
            // Close previous RFD and try again
            // eslint-disable-next-line no-await-in-loop
            await helper.transitionRFDForward(previousRFD, RFDwkf.STATUS_CLOSED)
            // eslint-disable-next-line no-await-in-loop
            result = await helper.deploymentStarted({
              issue: issue,
              pullRequest: pullRequestRef,
              targetEnvironment: targetEnvironment,
            })
            expect(result.errors).to.have.lengthOf(0)
          }
          // eslint-disable-next-line no-await-in-loop
          await helper.deploymentSuccessful({
            issue: issue,
            pullRequest: pullRequestRef,
            targetEnvironment: targetEnvironment,
          })
          // update in-memory RFD status (needed for next iteration)
          if (issue.fields) {
            issue.fields.status = RFDwkf.STATUS_RESOLVED
          }
          previousRFD = issue
        }
        return issues
      })
      .then(async issues => {
        for (const issue of issues) {
          if (issue?.fields?.issuetype?.name === IssueTypeNames.RFD) {
            keys1.push(issue.key)
          }
        }
        const state: any = {}
        // first we need to initialize the map to guarantee ordering
        for (const targetEnv of targetEnvironments) {
          state[targetEnv.toUpperCase()] = null
        }
        // eslint-disable-next-line max-nested-callbacks
        await jira.search({jql: `labels = "${TEST_SUITE_ID}" AND key in (${keys1.map(value => `"${value}"`).join(',')})`, fields: 'status,customfield_10121'})
        // eslint-disable-next-line max-nested-callbacks
        .then(result => {
          const issues: Issue[] = result.issues
          for (const issue of issues) {
            state[issue?.fields?.customfield_10121?.value?.toUpperCase() as string] = {status: {id: issue?.fields?.status?.id as string}}
          }
          expect(state).to.be.eql({DLVR: {status: {id: RFDwkf.STATUS_CLOSED.id}}, TEST: {status: {id: RFDwkf.STATUS_RESOLVED.id}}, PROD: {status: {id: RFDwkf.STATUS_APPROVED.id}}})
        })
      })

      await helper.createDeployments({
        issue: {key: rfc.key},
        pullRequest: pullRequestRef,
        targetEnvironment: targetEnvironments,
      })
      .then(async issues => {
        const keys2 = []
        // eslint-disable-next-line max-nested-callbacks
        const rfds = issues.filter(item => item?.fields?.issuetype?.name === IssueTypeNames.RFD)
        expect(rfds).to.have.lengthOf(3)
        // eslint-disable-next-line max-nested-callbacks
        const subtasks = issues.filter(item => item?.fields?.issuetype?.name === IssueTypeNames.RFDSubtask)
        expect(subtasks).to.have.lengthOf(3)
        for (const issue of rfds) {
          keys2.push(issue.key)
        }
        expect([...keys2.slice(0, -1), keys1[keys1.length - 1]]).to.be.deep.equal(keys2)
        const state: any = {}
        // first we need to initialize the map to guarantee ordering
        for (const targetEnv of targetEnvironments) {
          state[targetEnv.toUpperCase()] = null
        }
        // Check the status of the initial RFDs
        // eslint-disable-next-line max-nested-callbacks
        await jira.search({jql: `labels = "${TEST_SUITE_ID}" AND key in (${keys1.map(value => `"${value}"`).join(',')})`, fields: 'status,customfield_10121'})
        // eslint-disable-next-line max-nested-callbacks
        .then(result => {
          const issues: Issue[] = result.issues
          for (const issue of issues) {
            state[issue?.fields?.customfield_10121?.value?.toUpperCase() as string] = {status: {id: issue?.fields?.status?.id as string}}
          }
          expect(state).to.be.eql({DLVR: {status: {id: RFDwkf.STATUS_CLOSED.id}}, TEST: {status: {id: RFDwkf.STATUS_CLOSED.id}}, PROD: {status: {id: RFDwkf.STATUS_APPROVED.id}}})
        })
        // Check the status of the new RFDs
        // eslint-disable-next-line max-nested-callbacks
        await jira.search({jql: `labels = "${TEST_SUITE_ID}" AND key in (${keys2.map(value => `"${value}"`).join(',')})`, fields: 'status,customfield_10121'})
        // eslint-disable-next-line max-nested-callbacks
        .then(result => {
          const issues: Issue[] = result.issues
          for (const issue of issues) {
            state[issue?.fields?.customfield_10121?.value?.toUpperCase() as string] = {status: {id: issue?.fields?.status?.id as string}}
          }
          expect(state).to.be.eql({DLVR: {status: {id: RFDwkf.STATUS_OPEN.id}}, TEST: {status: {id: RFDwkf.STATUS_OPEN.id}}, PROD: {status: {id: RFDwkf.STATUS_APPROVED.id}}})
        })
      })
    }) // end it
  })
})
