import * as MochaNockBack from './mocha-nock-back'
import {CreateRfdParameters, RfdHelper} from '../../src/util/rfd-helper'
import {SecretManager} from '../../src/api/service/secret-manager'
import {createRFC, cleanUpTestCase} from './jira-util'
import Sinon from 'sinon'
import merge from 'lodash.merge'
import {expect} from 'chai'
import {AxiosBitBucketClient} from '../../src/api/service/axios-bitbucket-client'
import {ValidationError} from '../../src/validation-error'
import * as RFCwkf from '../../src/util/jira-rfc-workflow-v2.0.0'
import * as RFDwkf from '../../src/util/jira-rfd-workflow-v1.2.2'
import {DeploymentArgument, Issue} from '../../src/api/model/jira'

const TEST_CASE_ID = 'bf00473b394a'
const TEST_CASE_JIRA_PROJECT = 'SAMPLE'
const TEST_CASE_USERNAME1 = 'CVARJAO'
const TEST_CASE_USERNAME2 = 'NRCDA001'
const RFC_CHANGE_SPONSOR = TEST_CASE_USERNAME1
const RFC_CHANGE_COORDINATOR = TEST_CASE_USERNAME2
const sandbox = Sinon.createSandbox()

function shouldPassOrFail(rfcStatus: any, rfdStatus: any): string {
  if (rfcStatus.name === RFCwkf.STATUS_APPROVED.name && rfdStatus.name === RFDwkf.STATUS_APPROVED.name) {
    return 'pass'
  }
  return 'fail'
}

describe('jira:wokrflow', () => {
  SecretManager.loadEntries(require('../.local/secrets.json'))
  const  helper = new RfdHelper({})

  before(async function () {
    if (process.env.NOCK_BACK_MODE === 'lockdown') return Promise.resolve(true)
    MochaNockBack.afterEach.call(this)
    await cleanUpTestCase(await helper.createJiraClient(), TEST_CASE_ID, TEST_CASE_JIRA_PROJECT)
  })

  after(async function () {
    if (process.env.NOCK_BACK_MODE === 'lockdown') return Promise.resolve(true)
    MochaNockBack.afterEach.call(this)
    await cleanUpTestCase(await helper.createJiraClient(), TEST_CASE_ID, TEST_CASE_JIRA_PROJECT)
  })

  describe('RFC', () => {
    beforeEach(MochaNockBack.beforeEach())
    afterEach(MochaNockBack.afterEach)
    beforeEach(() => {
      sandbox.restore()
    })

    let RFC: any = null
    let version: any = null

    it('create RFC', async () => {
      await createRFC(await helper.createJiraClient(), {
        fields: {
          project: {key: TEST_CASE_JIRA_PROJECT},
          summary: `TEST RFC - ${TEST_CASE_ID}`,
          labels: [TEST_CASE_ID],
          customfield_10119: {name: RFC_CHANGE_SPONSOR}, // Change Sponsor
          customfield_10637: {name: RFC_CHANGE_COORDINATOR}, // Change Coordinator
        },
      })
      .then(result => {
        RFC = result
      })
      .catch(error => {
        throw error
      })
    })
    it('create-version', async () => {
      expect(RFC).to.not.be.null
      return helper.createVersion({project: TEST_CASE_JIRA_PROJECT, name: TEST_CASE_ID})
      .then(result => {
        expect(result).to.have.own.property('id')
        expect(result).to.have.own.property('name')
        version = {id: result.id, name: result.name}
      })
      .catch(error => {
        throw error
      })
    })
    for (const targetEnvironment of ['dlvr', 'test', 'prod']) {
      it(`deployment to ${targetEnvironment} started - 1`, async () => {
        const stubCreateRFD = sandbox.stub(helper, '_createRFD').callsFake((params: CreateRfdParameters) => {
          merge(params.issue, {fields: {labels: [TEST_CASE_ID], fixVersions: [version]}})
          return stubCreateRFD.wrappedMethod.bind(helper)(params)
        })
        await helper.createDeployments({
          issue: {key: RFC.key},
          pullRequest: {
            url: 'https://apps.nrs.gov.bc.ca/int/stash/projects/FAKE/repos/fake/pull-requests/15/overview',
            number: '15',
            sourceBranch: `release/${RFC.key}`,
            targetBranch: 'master',
            repository: AxiosBitBucketClient.parseUrl(`https://bwa.nrs.gov.bc.ca/int/stash/scm/FAKE/${TEST_CASE_ID}-A.git`),
          },
          targetEnvironment: targetEnvironment,
        })
      })
      it(`deployment to ${targetEnvironment} started - 2`, async () => {
        const stubCreateRFD = sandbox.stub(helper, '_createRFD').callsFake((params: CreateRfdParameters) => {
          merge(params.issue, {fields: {labels: [TEST_CASE_ID], fixVersions: [version]}})
          return stubCreateRFD.wrappedMethod.bind(helper)(params)
        })
        await helper.createDeployments({
          issue: {key: RFC.key},
          pullRequest: {
            url: 'https://apps.nrs.gov.bc.ca/int/stash/projects/FAKE/repos/fake/pull-requests/15/overview',
            number: '15',
            sourceBranch: `release/${RFC.key}`,
            targetBranch: 'master',
            repository: AxiosBitBucketClient.parseUrl(`https://bwa.nrs.gov.bc.ca/int/stash/scm/FAKE/${TEST_CASE_ID}-A.git`),
          },
          targetEnvironment: targetEnvironment,
        })
      })
      it(`deployment to ${targetEnvironment} started - 3`, async () => {
        const stubCreateRFD = sandbox.stub(helper, '_createRFD').callsFake((params: CreateRfdParameters) => {
          merge(params.issue, {fields: {labels: [TEST_CASE_ID], fixVersions: [version]}})
          return stubCreateRFD.wrappedMethod.bind(helper)(params)
        })
        await helper.createDeployments({
          issue: {key: RFC.key},
          pullRequest: {
            url: 'https://apps.nrs.gov.bc.ca/int/stash/projects/FAKE/repos/fake/pull-requests/15/overview',
            number: '15',
            sourceBranch: `release/${RFC.key}`,
            targetBranch: 'master',
            repository: AxiosBitBucketClient.parseUrl(`https://bwa.nrs.gov.bc.ca/int/stash/scm/FAKE/${TEST_CASE_ID}-B.git`),
          },
          targetEnvironment: targetEnvironment,
        })
      })
    }
    let pullRequestNumber = 1
    for (const rfcState of [RFCwkf.STATUS_OPEN, RFCwkf.STATUS_APPROVED]) {
      for (const targetEnvironment of ['dlvr', 'test', 'prod']) {
        for (const rfdState of [RFDwkf.STATUS_OPEN, RFDwkf.STATUS_APPROVED]) {
          it(`start - rfc=${rfcState.name},env=${targetEnvironment},rfd=${rfdState.name} - should ${shouldPassOrFail(rfcState, rfdState)}`, async () => {
            // eslint-disable-next-line no-console
            // console.log(`>deployment to ${targetEnvironment} started - rfc=${rfcState.name},rfd=${rfdState.name}`)
            pullRequestNumber++
            const jira = await helper.createJiraClient()
            const rfc = await createRFC(jira, {
              fields: {
                project: {key: TEST_CASE_JIRA_PROJECT},
                summary: `TEST RFC - ${TEST_CASE_ID}`,
                labels: [TEST_CASE_ID],
                customfield_10119: {name: RFC_CHANGE_SPONSOR}, // Change Sponsor
                customfield_10637: {name: RFC_CHANGE_COORDINATOR}, // Change Coordinator
              },
            })

            const stubCreateRFD = sandbox.stub(helper, '_createRFD').callsFake((params: CreateRfdParameters) => {
              merge(params.issue, {fields: {labels: [TEST_CASE_ID], fixVersions: [version]}})
              return stubCreateRFD.wrappedMethod.bind(helper)(params)
            })
            const stubCreateDeployments = sandbox.stub(helper, 'createDeployments').callsFake(async (params: DeploymentArgument) => {
              return stubCreateDeployments.wrappedMethod.bind(helper)(params)
              // eslint-disable-next-line max-nested-callbacks
              .then(async (issues: Issue[]) => {
                // trasition RFCs and RFDs
                for (const issue of issues) {
                  if (issue?.fields?.issuetype?.name === 'RFC') {
                    // eslint-disable-next-line no-await-in-loop
                    await helper.transitionRFCForward(issue, rfcState)
                  } else if (issue?.fields?.issuetype?.name === 'RFD') {
                    // eslint-disable-next-line no-await-in-loop
                    await helper.transitionRFDForward(issue, rfdState)
                  }
                }
                // re-fetch all issues since there ight have been some indirect changes triggered by transitions
                // eslint-disable-next-line max-nested-callbacks
                const keys = issues.map(value => '"' + value.key + '"').join(',')
                return jira.search({jql: `key in (${keys})`, fields: 'parent,fixVersions,issuetype,project,status,labels'})
                // eslint-disable-next-line max-nested-callbacks
                .then(result => {
                  return result.issues as Issue[]
                })
              })
            })

            await helper.deploymentStarted({
              issue: {key: rfc.key},
              pullRequest: {
                url: `https://apps.nrs.gov.bc.ca/int/stash/projects/FAKE/repos/fake/pull-requests/${pullRequestNumber}/overview`,
                number: `${pullRequestNumber}`,
                sourceBranch: `release/${rfc.key}`,
                targetBranch: 'master',
                repository: AxiosBitBucketClient.parseUrl(`https://bwa.nrs.gov.bc.ca/int/stash/scm/FAKE/${TEST_CASE_ID}-B.git`),
              },
              targetEnvironment: targetEnvironment,
            })
            .then(() => {
              expect(rfcState.name).to.be.eql(RFCwkf.STATUS_APPROVED.name)
              expect(rfdState.name).to.be.eql(RFDwkf.STATUS_APPROVED.name)
            })
            .catch(error => {
              expect(error).instanceOf(ValidationError)
              if (rfcState.name === RFCwkf.STATUS_APPROVED.name || rfdState.name === RFDwkf.STATUS_APPROVED.name) {
                expect((error as ValidationError).errors).to.have.lengthOf(1)
              } else {
                expect((error as ValidationError).errors).to.have.lengthOf(2)
              }
            })
          })
        }
      }
    }
    // transitionRFDpostDeployment
  })
})
