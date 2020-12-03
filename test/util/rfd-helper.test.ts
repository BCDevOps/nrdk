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
import {DeploymentArgument, Issue, IssueTypeNames} from '../../src/api/model/jira'

import jest_expect, {extend as jest_extend} from 'expect'
import {toMatchSnapshot} from './expect-mocha-snapshot'
import {Context} from 'mocha'
import {GeneralError} from '../../src/error'
import {LoggerFactory} from '../../src/util/logger'
jest_extend({toMatchSnapshot})

const TEST_SUITE_ID = 'bf00473b394a'
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

function sanitizeIssueLink(issueLink: any, issueSanitizer: Function) {
  delete issueLink.id
  delete issueLink.self
  delete issueLink.type.id
  delete issueLink.type.self
  delete issueLink.type.inward
  delete issueLink.type.outward
  if (issueLink.inwardIssue) issueSanitizer(issueLink.inwardIssue)
  if (issueLink.outwardIssue) issueSanitizer(issueLink.outwardIssue)
  return issueLink
}
let pullRequestNumber = 1

function sanitize(issue: any) {
  // eslint-disable-next-line guard-for-in
  for (const field in issue.fields) {
    const value = issue.fields[field]
    if (field === 'components') {
      for (const item of value) {
        delete item.self
        delete item.id
        delete item.description
      }
    } else if (field === 'customfield_10121') {
      delete value.self
      delete value.id
    } else if (field === 'issuetype' || field === 'status' || field === 'priority') {
      delete value.self
      delete value.id
      delete value.description
      delete value.subtask
      delete value.iconUrl
      delete value.statusCategory
      delete value.avatarId
    } else if (field === 'issuelinks') {
      for (const item of value) {
        sanitizeIssueLink(item, sanitize)
      }
    }
  }
  delete issue.fields.summary
  delete issue.expand
  delete issue.self
  delete issue.id
  delete issue.key
  return issue
}

// const LOGGER = LoggerFactory.createLogger(__filename)
/**
 * This is a System testing case which requires access to an JIRA installation
 */
describe('jira:workflow @type=system', () => {
  SecretManager.loadEntries(require('../.local/secrets.json'))
  const  helper = new RfdHelper({})

  before(async function () {
    // LoggerFactory.ROOT.level = 'debug'
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
    await cleanUpTestCase(await helper.createJiraClient(), TEST_SUITE_ID, TEST_CASE_JIRA_PROJECT)
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
          summary: `TEST RFC - ${TEST_SUITE_ID}`,
          labels: [TEST_SUITE_ID],
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
      return helper.createVersion({project: TEST_CASE_JIRA_PROJECT, name: TEST_SUITE_ID})
      .then(result => {
        expect(result).to.have.own.property('id')
        expect(result).to.have.own.property('name')
        version = {id: result.id, name: result.name}
      })
      .catch(error => {
        throw error
      })
    })
    it('multiple deployment request of the same component on open RFD should reuse RFD', async function (this: Context) {
      const TEST_CASE_ID = 'run-ca128f1d'
      const stubCreateRFD = sandbox.stub(helper, '_createRFD').callsFake((params: CreateRfdParameters) => {
        merge(params.issue, {fields: {labels: [TEST_SUITE_ID, TEST_CASE_ID], fixVersions: [version]}})
        return stubCreateRFD.wrappedMethod.bind(helper)(params)
      })
      const jira = await helper.createJiraClient()
      const rfc = await createRFC(jira, {
        fields: {
          project: {key: TEST_CASE_JIRA_PROJECT},
          summary: `TEST RFC - ${TEST_SUITE_ID}/${TEST_CASE_ID}`,
          labels: [TEST_SUITE_ID, TEST_CASE_ID],
          customfield_10119: {name: RFC_CHANGE_SPONSOR}, // Change Sponsor
          customfield_10637: {name: RFC_CHANGE_COORDINATOR}, // Change Coordinator
        },
      })
      for (let i = 0; i < 3; i++) {
        // eslint-disable-next-line no-await-in-loop
        await helper.createDeployments({
          issue: {key: rfc.key},
          pullRequest: {
            url: 'https://apps.nrs.gov.bc.ca/int/stash/projects/FAKE/repos/fake/pull-requests/15/overview',
            number: '15',
            sourceBranch: `release/${rfc.key}`,
            targetBranch: 'master',
            repository: AxiosBitBucketClient.parseUrl(`https://bwa.nrs.gov.bc.ca/int/stash/scm/FAKE/${TEST_SUITE_ID}-A.git`),
          },
          targetEnvironment: 'dlvr',
        })
      }
      await jira.search({jql: `labels = "${TEST_SUITE_ID}" AND labels = "${TEST_CASE_ID}" ORDER BY created ASC`, fields: 'status,issuetype,components,customfield_10121,issuelinks'})
      .then(result => {
        const issues: Issue[] = result.issues
        // eslint-disable-next-line max-nested-callbacks
        jest_expect(issues.map(issue => sanitize(issue))).toMatchSnapshot(this as any, '7b1f94cb7dfcdb5ed2d1e9775766c8c6')
      })
    })
    for (const rfdStatus of [RFDwkf.STATUS_APPROVED, RFDwkf.STATUS_SCHEDULED]) {
      it(`Transition RFD from Open to ${rfdStatus.name}`, async function (this: Context) {
        pullRequestNumber++
        const TEST_CASE_ID = `run-3634379f-${rfdStatus.id}`
        const _version = await helper.createVersion({project: TEST_CASE_JIRA_PROJECT, name: `${TEST_SUITE_ID}-${TEST_CASE_ID}`})
        const stubCreateRFD = sandbox.stub(helper, '_createRFD').callsFake((params: CreateRfdParameters) => {
          merge(params.issue, {fields: {labels: [TEST_SUITE_ID, TEST_CASE_ID], fixVersions: [_version]}})
          return stubCreateRFD.wrappedMethod.bind(helper)(params)
        })
        const jira = await helper.createJiraClient()
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
        const issues = await helper.createDeployments({
          issue: {key: rfc.key},
          pullRequest: {
            url: `https://apps.nrs.gov.bc.ca/int/stash/projects/FAKE/repos/${TEST_SUITE_ID}-${TEST_CASE_ID}/pull-requests/${pullRequestNumber}/overview`,
            number: '15',
            sourceBranch: `release/${rfc.key}`,
            targetBranch: 'master',
            repository: AxiosBitBucketClient.parseUrl(`https://bwa.nrs.gov.bc.ca/int/stash/scm/FAKE/${TEST_SUITE_ID}-${TEST_CASE_ID}.git`),
          },
          targetEnvironment: 'dlvr',
        })
        .catch(error => {
          throw new GeneralError('Error searching for issue', error)
        })
        expect(issues).to.have.lengthOf(3)
        for (const issue of issues) {
          if (issue?.fields?.issuetype?.name === IssueTypeNames.RFD) {
            // eslint-disable-next-line no-await-in-loop
            await helper.transitionRFDForward(issue, rfdStatus)
            .catch(error => {
              throw new GeneralError('Error transitioning RFD', error)
            })
          }
        }
        await jira.search({jql: `labels = "${TEST_SUITE_ID}" AND labels = "${TEST_CASE_ID}" ORDER BY created ASC`, fields: 'status,issuetype,components,customfield_10121,issuelinks'})
        .then(result => {
          const issues: Issue[] = result.issues
          expect(issues).to.have.lengthOf(3, `query: labels = "${TEST_SUITE_ID}" AND labels = "${TEST_CASE_ID}"`)
          for (const issue of issues) {
            if (issue?.fields?.issuetype?.name === IssueTypeNames.RFD || issue?.fields?.issuetype?.name === IssueTypeNames.RFDSubtask) {
              expect(issue?.fields?.status?.name).to.be.eqls(rfdStatus.name)
              expect(issue?.fields?.status?.id).to.be.eqls(rfdStatus.id)
            }
          }
          // eslint-disable-next-line max-nested-callbacks
          jest_expect(issues.map(issue => sanitize(issue))).toMatchSnapshot(this as any, `7857dbdeace55ed9c80160d474c6975e-${rfdStatus.id}`)
        })
      })
    }
    it('prepare deployments to multiple environments: dlvr, test, prod', async () => {
      const TEST_CASE_ID = 'run-df61bff5'
      const stubCreateRFD = sandbox.stub(helper, '_createRFD').callsFake((params: CreateRfdParameters) => {
        merge(params.issue, {fields: {labels: [TEST_SUITE_ID, TEST_CASE_ID], fixVersions: [version]}})
        return stubCreateRFD.wrappedMethod.bind(helper)(params)
      })
      const jira = await helper.createJiraClient()
      const rfc = await createRFC(jira, {
        fields: {
          project: {key: TEST_CASE_JIRA_PROJECT},
          summary: `TEST RFC - ${TEST_SUITE_ID}/${TEST_CASE_ID}`,
          labels: [TEST_SUITE_ID, TEST_CASE_ID],
          customfield_10119: {name: RFC_CHANGE_SPONSOR}, // Change Sponsor
          customfield_10637: {name: RFC_CHANGE_COORDINATOR}, // Change Coordinator
          fixVersions: [version],
        },
      })
      await helper.createDeployments({
        issue: {key: rfc.key},
        pullRequest: {
          url: 'https://apps.nrs.gov.bc.ca/int/stash/projects/FAKE/repos/fake/pull-requests/15/overview',
          number: '15',
          sourceBranch: `release/${rfc.key}`,
          targetBranch: 'master',
          repository: AxiosBitBucketClient.parseUrl(`https://bwa.nrs.gov.bc.ca/int/stash/scm/FAKE/${TEST_SUITE_ID}-A.git`),
        },
        targetEnvironment: ['dlvr', 'test', 'prod'],
      })
      await helper.createDeployments({
        issue: {key: rfc.key},
        pullRequest: {
          url: 'https://apps.nrs.gov.bc.ca/int/stash/projects/FAKE/repos/fake/pull-requests/15/overview',
          number: '15',
          sourceBranch: `release/${rfc.key}`,
          targetBranch: 'master',
          repository: AxiosBitBucketClient.parseUrl(`https://bwa.nrs.gov.bc.ca/int/stash/scm/FAKE/${TEST_SUITE_ID}-B.git`),
        },
        targetEnvironment: ['dlvr', 'test', 'prod'],
      })
    })
    it('re-start deployments to multiple environments: dlvr, test, prod', async () => {
      const TEST_CASE_ID = 'run-d0b4e6cf'
      const stubCreateRFD = sandbox.stub(helper, '_createRFD').callsFake((params: CreateRfdParameters) => {
        merge(params.issue, {fields: {labels: [TEST_SUITE_ID, TEST_CASE_ID], fixVersions: [version]}})
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
          fixVersions: [version],
        },
      })
      if (!rfc.fields) rfc.fields = {}
      rfc.fields.status = RFCwkf.STATUS_OPEN
      await helper.transitionRFCForward(rfc, RFCwkf.STATUS_APPROVED)
      const keys1: any[] = []
      await helper.createDeployments({
        issue: {key: rfc.key},
        pullRequest: {
          url: 'https://apps.nrs.gov.bc.ca/int/stash/projects/FAKE/repos/fake/pull-requests/15/overview',
          number: '15',
          sourceBranch: `release/${rfc.key}`,
          targetBranch: 'master',
          repository: AxiosBitBucketClient.parseUrl(`https://bwa.nrs.gov.bc.ca/int/stash/scm/FAKE/${TEST_SUITE_ID}-A.git`),
        },
        targetEnvironment: targetEnvironments,
      }).then(async issues => {
        // all but the last one is in resolved state
        // eslint-disable-next-line max-nested-callbacks
        const rfds = issues.filter(item => item?.fields?.issuetype?.name === IssueTypeNames.RFD)
        for (const issue of rfds) {
          let rfdStatus = RFDwkf.STATUS_RESOLVED
          if (issue.key === rfds[rfds.length - 1].key) {
            rfdStatus = RFDwkf.STATUS_APPROVED
          }
          // eslint-disable-next-line no-await-in-loop
          await helper.transitionRFDForward(issue, rfdStatus)
        }
        return issues
      }).then(async issues => {
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
          expect(state).to.be.eql({DLVR: {status: {id: RFDwkf.STATUS_RESOLVED.id}}, TEST: {status: {id: RFDwkf.STATUS_RESOLVED.id}}, PROD: {status: {id: RFDwkf.STATUS_APPROVED.id}}})
        })
      })

      await helper.createDeployments({
        issue: {key: rfc.key},
        pullRequest: {
          url: 'https://apps.nrs.gov.bc.ca/int/stash/projects/FAKE/repos/fake/pull-requests/15/overview',
          number: '15',
          sourceBranch: `release/${rfc.key}`,
          targetBranch: 'master',
          repository: AxiosBitBucketClient.parseUrl(`https://bwa.nrs.gov.bc.ca/int/stash/scm/FAKE/${TEST_SUITE_ID}-B.git`),
        },
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
    })
    for (const rfcState of [RFCwkf.STATUS_OPEN, RFCwkf.STATUS_APPROVED]) {
      for (const targetEnvironment of ['dlvr', 'test', 'prod']) {
        for (const rfdState of [RFDwkf.STATUS_OPEN, RFDwkf.STATUS_APPROVED]) {
          it(`start - rfc=${rfcState.name},env=${targetEnvironment},rfd=${rfdState.name} - should ${shouldPassOrFail(rfcState, rfdState)}`, async () => {
            const TEST_CASE_ID = `run-cc39b16d-${rfcState.id}-${targetEnvironment}-${rfdState.id}`
            // eslint-disable-next-line no-console
            // console.log(`>deployment to ${targetEnvironment} started - rfc=${rfcState.name},rfd=${rfdState.name}`)
            pullRequestNumber++
            const jira = await helper.createJiraClient()
            const rfc = await createRFC(jira, {
              fields: {
                project: {key: TEST_CASE_JIRA_PROJECT},
                summary: `TEST RFC - ${TEST_SUITE_ID}`,
                labels: [TEST_SUITE_ID, TEST_CASE_ID],
                customfield_10119: {name: RFC_CHANGE_SPONSOR}, // Change Sponsor
                customfield_10637: {name: RFC_CHANGE_COORDINATOR}, // Change Coordinator
                fixVersions: [version],
              },
            })

            const stubCreateRFD = sandbox.stub(helper, '_createRFD').callsFake((params: CreateRfdParameters) => {
              merge(params.issue, {fields: {labels: [TEST_SUITE_ID, TEST_CASE_ID], fixVersions: [version]}})
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
                // re-fetch all issues since there might have been some indirect changes triggered by transitions
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
                repository: AxiosBitBucketClient.parseUrl(`https://bwa.nrs.gov.bc.ca/int/stash/scm/FAKE/${TEST_SUITE_ID}-B.git`),
              },
              targetEnvironment: targetEnvironment,
            })
            .then(result => {
              if (result.errors && result.errors.length > 0) {
                if (rfcState.name !== RFCwkf.STATUS_APPROVED.name) {
                  // eslint-disable-next-line max-nested-callbacks
                  expect(result.errors.map(v => v.cause).filter((v: string) => v.match(/RFC '[^']+' is currently in '[^']+' state but expected to be/))).to.have.lengthOf(1)
                }
                if (rfdState.name !== RFDwkf.STATUS_APPROVED.name) {
                  // eslint-disable-next-line max-nested-callbacks
                  expect(result.errors.map(v => v.cause).filter((v: string) => v.match(/RFD '[^']+' is currently in '[^']+' state but expected to be/))).to.have.lengthOf(1)
                  // eslint-disable-next-line max-nested-callbacks
                  expect(result.errors.map(v => v.cause).filter((v: string) => v.match(/RFD-subtask '[^']+' is currently in '[^']+' state but expected to be/))).to.have.lengthOf(1)
                }
                return
              }
              expect(rfcState.name).to.be.eql(RFCwkf.STATUS_APPROVED.name)
              expect(rfdState.name).to.be.eql(RFDwkf.STATUS_APPROVED.name)
              expect(result.errors).to.have.lengthOf(0)
              for (const issue of result.issues) {
                if (issue?.fields?.issuetype?.name === IssueTypeNames.RFD || issue?.fields?.issuetype?.name === IssueTypeNames.RFDSubtask) {
                  expect(issue?.fields?.status?.name).to.be.eql(RFDwkf.STATUS_IN_PROGRESS.name, issue?.key)
                }
              }
            })
            // .catch(error => {
            //   throw new GeneralError('Something went wrong', error)
            // })
          })
        }
      }
    }
    // transitionRFDpostDeployment
  })
})
