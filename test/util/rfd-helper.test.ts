import * as MochaNockBack from './mocha-nock-back'
import {RfdHelper} from '../../src/util/rfd-helper'
import {SecretManager} from '../../src/api/service/secret-manager'
import {createRFC, cleanUpTestCase} from './jira-util'

const TEST_CASE_ID = '9450b26c-01b2-4072-ae66-44c6f4b6ccb7'
const TEST_CASE_JIRA_PROJECT = 'ONETEAM'
const TEST_CASE_USERNAME1 = 'CVARJAO'
const TEST_CASE_USERNAME2 = 'NRCDA001'
const RFC_CHANGE_SPONSOR = TEST_CASE_USERNAME1
const RFC_CHANGE_COORDINATOR = TEST_CASE_USERNAME2

describe('jira:wokrflow', () => {
  SecretManager.loadEntries(require('../.local/secrets.json'))
  const  helper = new RfdHelper({})

  before(async function () {
    if (process.env.NOCK_BACK_MODE === 'lockdown') return Promise.resolve(true)
    MochaNockBack.afterEach.call(this)
    await cleanUpTestCase(await helper.createJiraClient(), TEST_CASE_ID, TEST_CASE_JIRA_PROJECT)
  })

  describe('RFC', () => {
    beforeEach(MochaNockBack.beforeEach())
    afterEach(MochaNockBack.afterEach)
    let RFC: any = null

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
        // eslint-disable-next-line no-console
        console.dir(RFC)
      })
      .catch(error => {
        throw error
      })
    })
    it('deployment started', async () => {
      // Sinon.stub(helper, 'createJiraClient')
      await helper.deploymentStarted({
        issue: {url: `https://apps.nrs.gov.bc.ca/int/jira/browse/${RFC.key}`},
        pullRequest: {
          url: 'https://apps.nrs.gov.bc.ca/int/stash/projects/FAKE/repos/fake/pull-requests/15/overview',
          sourceBranch: `release/${RFC.key}`,
          targetBranch: 'master',
          repository: {
            url: 'https://bwa.nrs.gov.bc.ca/int/stash/scm/irs/irs-war.git',
          },
        },
        targetEnvironment: 'dlvr',
      })
    })
    // transitionRFDpostDeployment
  })
})
