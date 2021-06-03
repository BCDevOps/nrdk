'use strict'
const Jira = require('../lib/Jira')
const expect = require('expect')
const toMatchSnapshot = require('./expect-mocha-snapshot')
expect.extend({toMatchSnapshot})
const sinon = require('sinon')
const nock = require('nock')
const sandbox = sinon.createSandbox()
const {ENV, ISSUE_LINK_TYPE_NAME, VERIFY_STATUS, REASON} = require('../lib/constants')
const {previousEnv} = require('../lib/util-functions')
const Verifier = require('../lib/InputDeployerVerify')
const {JiraMock, RFCWORKFLOW, RFDWORKFLOW} = require('./JiraMock')

describe('RFC Verification:', function () {
  this.timeout(50000)

  beforeEach('Using fake settings to create JIRA object', function () {
    if (!nock.isActive()) {
      nock.activate()
    }
    nock.disableNetConnect()
  })
  afterEach('Completely restore all fakes created through the sandbox', function () {
    sandbox.restore()
    nock.restore()
    nock.cleanAll()
  })
  // const verifier = new Verifier(config)
  const environments = ['dlvr', 'test', 'prod']
  for (const env of environments) {
    for (const status of RFCWORKFLOW.ALL_STATUS) {
      it(`env: ${env}, status: ${status.name} (${status.id}), no RFDs`, async function () {
        const jiraSettings = JiraMock.createJiraClientSettings()
        const config = {
          jiraUrl: jiraSettings.url,
          phases: {
            [env]: {credentials: {idir: {user: jiraSettings.username, pass: jiraSettings.password}}},
          },
        }
        const jiraServer = new JiraMock()
        const rfc = jiraServer.createRFC()
        const verifier = new Verifier(config)
        jiraServer._addIssue(rfc)
        jiraServer.start()
        jiraServer.patchIssue(rfc, {fields: {status: status}})
        const result = await verifier.isReadyForDeployment(env, rfc.key)
        await expect(result).toMatchSnapshot(this, `388a19ef-a1d7-47ab-9ca4-4eff419aab96-${env}-${status.id}`)
        if (status === RFCWORKFLOW.STATUS_APPROVED) {
          await expect(status).toEqual(RFCWORKFLOW.STATUS_APPROVED)
          await expect(result.status).toEqual(VERIFY_STATUS.READY)
        } else {
          await expect(status).not.toEqual(RFCWORKFLOW.STATUS_APPROVED)
          await expect(result.status).toEqual(VERIFY_STATUS.NOT_READY)
        }
      })
    }
  }
  it("When RFC/RFD conditions are not met, return result with 'Not Ready' status", async function () {
    const isReadyForDeploymentStub = sandbox.stub(Verifier.prototype, 'isReadyForDeployment')
    const env = 'test'
    const settings = getDefaultSettings()
    settings.options.env = env
    settings.phase = env
    const keys = settings.options.git.branch.merge.split('-')
    const rfcIssuKey = keys[0] + '-' + keys[1]
    const verifier = new Verifier(settings)
    isReadyForDeploymentStub.withArgs(env, rfcIssuKey).resolves({
      status: 'Not Ready',
      rfcRfdContext: {
        rfcIssueKey: 'MyRFCissue-99',
        rfcStatus: 'In Review for Test',
        rfdsByEnv: {
          test: {
            rfds: [
              {
                issueKey: 'RFD-AUTO-TEST-01',
                labels: 'auto',
                env: 'test',
                status: 'Approved',
                blockedBy: [
                  {
                    issueKey: 'INWARDISSUE-0',
                    status: 'Some Other Status',
                    blockingOn: 'RFD-AUTO-TEST-01',
                  },
                ],
              },
              {
                issueKey: 'RFD-BUSINESS-TEST-01',
                labels: 'some-label',
                env: 'test',
                status: 'Some Other Status',
                blockedBy: [],
              },
            ],
            previousEnvRfds: [
              {issueKey: 'RFD-AUTO-DLVR-01', env: 'dlvr', status: 'Some Other Status', labels: 'auto'},
            ],
          },
        },
      },
      reason: {
        RFD_BLOCKED: {
          description: 'RFD(s) are blocked',
          issueItems: [
            {issueKey: 'INWARDISSUE-0', status: 'Some Other Status', blockingOn: 'RFD-AUTO-TEST-01'},
          ],
        },
        RFD_NOT_APPROVED: {
          description: 'RFD(s) are not approved',
          issueItems: [
            {
              issueKey: 'RFD-BUSINESS-TEST-01',
              labels: 'some-label',
              env: 'test',
              status: 'Some Other Status',
              blockedBy: [],
            },
          ],
        },
        PREVIOUS_RFD_NOT_CLOSED: {
          description: 'Previous stage RFD(s) are not closed',
          issueItems: [{issueKey: 'RFD-AUTO-DLVR-01', env: 'dlvr', status: 'Approved', labels: 'auto'}],
        },
        RFC_NOT_AUTHORIZED: {
          description: 'RFC is not authorized to target environment',
          issueItems: [{issueKey: 'MyRFCissue-99', status: 'In Review for Test'}],
        },
      },
    })

    // Act
    const result = await verifier.verifyBeforeDeployment(settings)
    expect(result).toBeDefined()
    expect(result.status).toEqual(VERIFY_STATUS.NOT_READY)
  })
})

describe('obtainCurrentRfcRfdContext:', function () {
  this.timeout(50000)
  let jiraClientStub

  this.beforeEach(function () {
    jiraClientStub = sandbox.stub(Jira.prototype)
  })

  this.afterEach(function () {
    sandbox.restore()
  })

  context('Function isReadyForDeployment()', function () {
    it('When RFC is not found, Error throws', async function () {
      jiraClientStub.retrieveRfcIssueInfo.resolves(undefined)

      // Act
      const verifier = new Verifier(getDefaultSettings())
      return expect(verifier.isReadyForDeployment('dlvr', 'invalidIssueKey')).rejects.toThrow()
    })

    it("When RFDs blockedBy others, return result: status='Not Ready', rfcRfdContext and reason with code: REASON_CODE_RFD_BLOCKED", async function () {
      // Arrange
      const env = 'test'
      const settings = getDefaultSettings()
      settings.options.env = env
      settings.phase = env
      const verifier = new Verifier(settings)
      const blockedByRfcRfdContext = {
        rfcIssueKey: 'MyRFCissue-99',
        rfcStatus: 'Authorized for Test',
        rfdsByEnv: {
          test: {
            rfds: [
              {
                issueKey: 'RFD-AUTO-TEST-01',
                labels: 'auto',
                env: 'test',
                status: 'Approved',
                blockedBy: [
                  {
                    issueKey: 'INWARDISSUE-0',
                    status: 'Some Other Status',
                    blockingOn: 'RFD-AUTO-TEST-01',
                  },
                ],
              },
              {
                issueKey: 'RFD-BUSINESS-TEST-01',
                labels: 'some-label',
                env: 'test',
                status: 'Some Other Status',
                blockedBy: [],
              },
            ],
            previousEnvRfds: [
              {issueKey: 'RFD-AUTO-DLVR-01', env: 'dlvr', status: 'Closed', labels: 'auto'},
            ],
          },
        },
      }
      const rfcIssueKey = blockedByRfcRfdContext.rfcIssueKey
      sandbox.stub(verifier, 'obtainCurrentRfcRfdContext').returns(Promise.resolve(blockedByRfcRfdContext))

      // Act
      const result = await verifier.isReadyForDeployment(env, rfcIssueKey)
      // console.log('result:', JSON.stringify(result));

      // Verify
      sandbox.assert.calledWith(verifier.obtainCurrentRfcRfdContext, env, rfcIssueKey)
      expect(result.status).toEqual(VERIFY_STATUS.NOT_READY)
      expect(Object.keys(result)).toEqual(expect.arrayContaining(['status', 'rfcRfdContext', 'reason']))
      expect(result.rfcRfdContext).toEqual(blockedByRfcRfdContext)
      expect(Object.keys(result.reason)).toContain(REASON.REASON_CODE_RFD_BLOCKED)
      const blocked = result.reason[REASON.REASON_CODE_RFD_BLOCKED]
      expect(blocked.issueItems.length).not.toBe(0)
      const rfds = blockedByRfcRfdContext.rfdsByEnv[env].rfds.map(rfd => rfd.issueKey)
      blocked.issueItems.forEach(item => {
        expect(item.status).not.toBe(RFDWORKFLOW.STATUS_RESOLVED.name)
        expect(rfds).toContain(item.blockingOn)
      })
    })

    it("Some of current stage RFDs are not approved, return result: status='Not Ready', rfcRfdContext and reason with code: REASON_CODE_RFD_NOT_APPROVED", async function () {
      // Arrange
      const env = 'test'
      const settings = getDefaultSettings()
      settings.options.env = env
      settings.phase = env
      const verifier = new Verifier(settings)
      const rfdNotApprovedRfcRfdContext = {
        rfcIssueKey: 'MyRFCissue-99',
        rfcStatus: 'Authorized for Test',
        rfdsByEnv: {
          test: {
            rfds: [
              {
                issueKey: 'RFD-AUTO-TEST-01',
                labels: 'auto',
                env: 'test',
                status: 'Approved',
                blockedBy: [
                  {issueKey: 'INWARDISSUE-0', status: 'Resolved', blockingOn: 'RFD-AUTO-TEST-01'},
                ],
              },
              {
                issueKey: 'RFD-BUSINESS-TEST-01',
                labels: 'some-label',
                env: 'test',
                status: 'Some Other Status',
                blockedBy: [],
              },
            ],
            previousEnvRfds: [
              {issueKey: 'RFD-AUTO-DLVR-01', env: 'dlvr', status: 'Closed', labels: 'auto'},
            ],
          },
        },
      }
      const rfcIssueKey = rfdNotApprovedRfcRfdContext.rfcIssueKey
      sandbox.stub(verifier, 'obtainCurrentRfcRfdContext').resolves(rfdNotApprovedRfcRfdContext)

      // Act
      const result = await verifier.isReadyForDeployment(env, rfcIssueKey)
      // console.log('result:', JSON.stringify(result));

      // Verify
      sandbox.assert.calledWith(verifier.obtainCurrentRfcRfdContext, env, rfcIssueKey)
      expect(result.status).toEqual(VERIFY_STATUS.NOT_READY)
      expect(Object.keys(result)).toEqual(expect.arrayContaining(['status', 'rfcRfdContext', 'reason']))
      expect(result.rfcRfdContext).toEqual(rfdNotApprovedRfcRfdContext)
      expect(Object.keys(result.reason)).toContain(REASON.REASON_CODE_RFD_NOT_APPROVED)
      const notApproved = result.reason[REASON.REASON_CODE_RFD_NOT_APPROVED]
      expect(notApproved.issueItems.length).not.toBe(0)
      const resultIssueItemsIssueKeys = notApproved.issueItems.map(item => item.issueKey)
      expect(resultIssueItemsIssueKeys).toContain(rfdNotApprovedRfcRfdContext.rfdsByEnv[env].rfds[1].issueKey)
      notApproved.issueItems.forEach(issueItem => {
        expect(issueItem.env).toEqual(env)
        expect(issueItem.status).not.toEqual(RFDWORKFLOW.STATUS_APPROVED.name)
      })
    })

    it("Some of previous stage RFDs are not closed, return result: status='Not Ready', rfcRfdContext and reason with code: REASON_CODE_PREVIOUS_RFD_NOT_CLOSED", async function () {
      // Arrange
      const env = 'test'
      const settings = getDefaultSettings()
      settings.options.env = env
      settings.phase = env
      const verifier = new Verifier(settings)
      const previousRfdNotClosedRfcRfdContext = {
        rfcIssueKey: 'MyRFCissue-99',
        rfcStatus: 'Authorized for Test',
        rfdsByEnv: {
          test: {
            rfds: [
              {
                issueKey: 'RFD-AUTO-TEST-01',
                labels: 'auto',
                env: 'test',
                status: 'Approved',
                blockedBy: [
                  {issueKey: 'INWARDISSUE-0', status: 'Resolved', blockingOn: 'RFD-AUTO-TEST-01'},
                ],
              },
              {
                issueKey: 'RFD-BUSINESS-TEST-01',
                labels: 'some-label',
                env: 'test',
                status: 'Approved',
                blockedBy: [
                  {
                    issueKey: 'INWARDISSUE-0',
                    status: 'Resolved',
                    blockingOn: 'RFD-BUSINESS-TEST-01',
                  },
                  {
                    issueKey: 'INWARDISSUE-1',
                    status: 'Resolved',
                    blockingOn: 'RFD-BUSINESS-TEST-01',
                  },
                  {
                    issueKey: 'INWARDISSUE-2',
                    status: 'Resolved',
                    blockingOn: 'RFD-BUSINESS-TEST-01',
                  },
                ],
              },
            ],
            previousEnvRfds: [
              {issueKey: 'RFD-AUTO-DLVR-01', env: 'dlvr', status: 'Approved', labels: 'auto'},
            ],
          },
        },
      }
      const rfcIssueKey = previousRfdNotClosedRfcRfdContext.rfcIssueKey
      sandbox.stub(verifier, 'obtainCurrentRfcRfdContext').resolves(previousRfdNotClosedRfcRfdContext)

      // Act
      const result = await verifier.isReadyForDeployment(env, rfcIssueKey)
      // console.log('result:', JSON.stringify(result));

      // Verify
      sandbox.assert.calledWith(verifier.obtainCurrentRfcRfdContext, env, rfcIssueKey)
      expect(result.status).toEqual(VERIFY_STATUS.NOT_READY)
      expect(Object.keys(result)).toEqual(expect.arrayContaining(['status', 'rfcRfdContext', 'reason']))
      expect(result.rfcRfdContext).toEqual(previousRfdNotClosedRfcRfdContext)
      expect(Object.keys(result.reason)).toContain(REASON.REASON_CODE_PREVIOUS_RFD_NOT_CLOSED)
      const pNotClosed = result.reason[REASON.REASON_CODE_PREVIOUS_RFD_NOT_CLOSED]
      expect(pNotClosed.issueItems.length).not.toBe(0)
      const resultIssueItemsIssueKeys = pNotClosed.issueItems.map(item => item.issueKey)
      expect(resultIssueItemsIssueKeys).toContain(
        previousRfdNotClosedRfcRfdContext.rfdsByEnv[env].previousEnvRfds[0].issueKey,
      )
      pNotClosed.issueItems.forEach(issueItem => {
        expect(issueItem.env).toEqual(previousEnv(env))
        expect(issueItem.status).not.toEqual(RFDWORKFLOW.STATUS_CLOSED.name)
      })
    })

    it("ENV=dlvr but RFC is not Authorized to Int, return result: status='Not Ready', rfcRfdContext and reason with code: REASON_CODE_RFC_NOT_AUTHORIZED", async function () {
      // Arrange
      const env = 'dlvr'
      const settings = getDefaultSettings()
      settings.options.env = env
      settings.phase = env
      const verifier = new Verifier(settings)
      const dlvrRFCnotAuthorizedRfcRfdContext = {
        rfcIssueKey: 'MyRFCissue-99',
        rfcStatus: 'In Review for Int',
        rfdsByEnv: {
          dlvr: {
            rfds: [
              {
                issueKey: 'RFD-AUTO-DLVR-01',
                labels: 'auto',
                env: 'dlvr',
                status: 'Approved',
                blockedBy: [
                  {issueKey: 'INWARDISSUE-0', status: 'Resolved', blockingOn: 'RFD-AUTO-DLVR-01'},
                ],
              },
            ],
            previousEnvRfds: [],
          },
        },
      }
      const rfcIssueKey = dlvrRFCnotAuthorizedRfcRfdContext.rfcIssueKey
      sandbox.stub(verifier, 'obtainCurrentRfcRfdContext').resolves(dlvrRFCnotAuthorizedRfcRfdContext)

      // Act
      const result = await verifier.isReadyForDeployment(env, rfcIssueKey)
      // console.log('result:', JSON.stringify(result));

      // Verify
      sandbox.assert.calledWith(verifier.obtainCurrentRfcRfdContext, env, rfcIssueKey)
      expect(result.status).toEqual(VERIFY_STATUS.NOT_READY)
      expect(Object.keys(result)).toEqual(expect.arrayContaining(['status', 'rfcRfdContext', 'reason']))
      expect(result.rfcRfdContext).toEqual(dlvrRFCnotAuthorizedRfcRfdContext)
      expect(Object.keys(result.reason)).toContain(REASON.REASON_CODE_RFC_NOT_AUTHORIZED)
      const notAuthorized = result.reason[REASON.REASON_CODE_RFC_NOT_AUTHORIZED]
      expect(notAuthorized.issueItems[0].issueKey).toEqual(rfcIssueKey)
      expect(notAuthorized.issueItems[0].status).not.toEqual(RFCWORKFLOW.STATUS_AUTHORIZED_FOR_INT)
      expect(notAuthorized.issueItems[0].env).toEqual(env)
    })

    it("ENV=test but RFC is not Authorized to Test, return result: status='Not Ready', rfcRfdContext and reason with code: REASON_CODE_RFC_NOT_AUTHORIZED", async function () {
      // Arrange
      const env = 'test'
      const settings = getDefaultSettings()
      settings.options.env = env
      settings.phase = env
      const verifier = new Verifier(settings)
      const testRFCnotAuthorizedRfcRfdContext = {
        rfcIssueKey: 'MyRFCissue-99',
        rfcStatus: 'In Review for Test',
        rfdsByEnv: {
          test: {
            rfds: [
              {
                issueKey: 'RFD-AUTO-TEST-01',
                labels: 'auto',
                env: 'test',
                status: 'Approved',
                blockedBy: [
                  {issueKey: 'INWARDISSUE-0', status: 'Resolved', blockingOn: 'RFD-AUTO-TEST-01'},
                ],
              },
              {
                issueKey: 'RFD-BUSINESS-TEST-01',
                labels: 'some-label',
                env: 'test',
                status: 'Approved',
                blockedBy: [
                  {
                    issueKey: 'INWARDISSUE-0',
                    status: 'Resolved',
                    blockingOn: 'RFD-BUSINESS-TEST-01',
                  },
                  {
                    issueKey: 'INWARDISSUE-1',
                    status: 'Resolved',
                    blockingOn: 'RFD-BUSINESS-TEST-01',
                  },
                  {
                    issueKey: 'INWARDISSUE-2',
                    status: 'Resolved',
                    blockingOn: 'RFD-BUSINESS-TEST-01',
                  },
                ],
              },
            ],
            previousEnvRfds: [
              {issueKey: 'RFD-AUTO-DLVR-01', env: 'dlvr', status: 'Closed', labels: 'auto'},
            ],
          },
        },
      }
      const rfcIssueKey = testRFCnotAuthorizedRfcRfdContext.rfcIssueKey
      sandbox.stub(verifier, 'obtainCurrentRfcRfdContext').resolves(testRFCnotAuthorizedRfcRfdContext)

      // Act
      const result = await verifier.isReadyForDeployment(env, rfcIssueKey)
      // console.log('result:', JSON.stringify(result));

      // Verify
      sandbox.assert.calledWith(verifier.obtainCurrentRfcRfdContext, env, rfcIssueKey)
      expect(result.status).toEqual(VERIFY_STATUS.NOT_READY)
      expect(Object.keys(result)).toEqual(expect.arrayContaining(['status', 'rfcRfdContext', 'reason']))
      expect(result.rfcRfdContext).toEqual(testRFCnotAuthorizedRfcRfdContext)
      expect(Object.keys(result.reason)).toContain(REASON.REASON_CODE_RFC_NOT_AUTHORIZED)
      const notAuthorized = result.reason[REASON.REASON_CODE_RFC_NOT_AUTHORIZED]
      expect(notAuthorized.issueItems[0].issueKey).toEqual(rfcIssueKey)
      expect(notAuthorized.issueItems[0].status).not.toEqual(RFCWORKFLOW.STATUS_AUTHORIZED_FOR_TEST)
      expect(notAuthorized.issueItems[0].env).toEqual(env)
    })

    it("ENV=prod but RFC is not Authorized to Prod, return result: status='Not Ready', rfcRfdContext and reason with code: REASON_CODE_RFC_NOT_AUTHORIZED", async function () {
      // Arrange
      const env = 'prod'
      const settings = getDefaultSettings()
      settings.options.env = env
      settings.phase = env
      const verifier = new Verifier(settings)
      const prodRFCnotAuthorizedRfcRfdContext = {
        rfcIssueKey: 'MyRFCissue-99',
        rfcStatus: 'In Review for Prod',
        rfdsByEnv: {
          prod: {
            rfds: [
              {
                issueKey: 'RFD-AUTO-PROD-01',
                labels: 'auto',
                env: 'prod',
                status: 'Approved',
                blockedBy: [],
              },
            ],
            previousEnvRfds: [
              {issueKey: 'RFD-AUTO-TEST-01', env: 'test', status: 'Closed', labels: 'auto'},
            ],
          },
        },
      }
      const rfcIssueKey = prodRFCnotAuthorizedRfcRfdContext.rfcIssueKey
      sandbox.stub(verifier, 'obtainCurrentRfcRfdContext').resolves(prodRFCnotAuthorizedRfcRfdContext)

      // Act
      const result = await verifier.isReadyForDeployment(env, rfcIssueKey)
      // console.log('result:', JSON.stringify(result));

      // Verify
      sandbox.assert.calledWith(verifier.obtainCurrentRfcRfdContext, env, rfcIssueKey)
      expect(result.status).toEqual(VERIFY_STATUS.NOT_READY)
      expect(Object.keys(result)).toEqual(expect.arrayContaining(['status', 'rfcRfdContext', 'reason']))
      expect(result.rfcRfdContext).toEqual(prodRFCnotAuthorizedRfcRfdContext)
      expect(Object.keys(result.reason)).toContain(REASON.REASON_CODE_RFC_NOT_AUTHORIZED)
      const notAuthorized = result.reason[REASON.REASON_CODE_RFC_NOT_AUTHORIZED]
      expect(notAuthorized.issueItems[0].issueKey).toEqual(rfcIssueKey)
      expect(notAuthorized.issueItems[0].status).not.toEqual(RFCWORKFLOW.STATUS_AUTHORIZED_FOR_PROD)
      expect(notAuthorized.issueItems[0].env).toEqual(env)
    })

    it("When all conditions passed verification, return result: status='Ready' and rfcRfdContext", async function () {
      // Arrange
      const env = 'test'
      const settings = getDefaultSettings()
      settings.options.env = env
      settings.phase = env
      const verifier = new Verifier(settings)
      const testAllVerifiedRfcRfdContext = {
        rfcIssueKey: 'MyRFCissue-99',
        rfcStatus: RFCWORKFLOW.STATUS_APPROVED.name,
        rfdsByEnv: {
          test: {
            rfds: [
              {
                issueKey: 'RFD-AUTO-TEST-01',
                labels: 'auto',
                env: 'test',
                status: 'Approved',
                blockedBy: [
                  {issueKey: 'INWARDISSUE-0', status: 'Resolved', blockingOn: 'RFD-AUTO-TEST-01'},
                ],
              },
              {
                issueKey: 'RFD-BUSINESS-TEST-01',
                labels: 'some-label',
                env: 'test',
                status: 'Approved',
                blockedBy: [
                  {
                    issueKey: 'INWARDISSUE-0',
                    status: 'Resolved',
                    blockingOn: 'RFD-BUSINESS-TEST-01',
                  },
                  {
                    issueKey: 'INWARDISSUE-1',
                    status: 'Resolved',
                    blockingOn: 'RFD-BUSINESS-TEST-01',
                  },
                  {
                    issueKey: 'INWARDISSUE-2',
                    status: 'Resolved',
                    blockingOn: 'RFD-BUSINESS-TEST-01',
                  },
                ],
              },
            ],
            previousEnvRfds: [
              {issueKey: 'RFD-AUTO-DLVR-01', env: 'dlvr', status: 'Closed', labels: 'auto'},
            ],
          },
        },
      }
      const rfcIssueKey = testAllVerifiedRfcRfdContext.rfcIssueKey
      sandbox.stub(verifier, 'obtainCurrentRfcRfdContext').resolves(testAllVerifiedRfcRfdContext)

      // Act
      const result = await verifier.isReadyForDeployment(env, rfcIssueKey)
      // console.log('result:', JSON.stringify(result));

      // Verify
      sandbox.assert.calledWith(verifier.obtainCurrentRfcRfdContext, env, rfcIssueKey)
      expect(result.status).toEqual(VERIFY_STATUS.READY)
      expect(Object.keys(result)).toEqual(expect.arrayContaining(['status', 'rfcRfdContext']))
      expect(result.rfcRfdContext).toEqual(testAllVerifiedRfcRfdContext)
    })
  })

  context('Function obtainCurrentRfcRfdContext()', function () {
    it("At 'dlvr' env, With rfc/rfd issues can be found, returns Rfc/Rfd context for caller function", async function () {
      // Arrange
      const rfcIssueKeyStub = 'MyRFCissue-99'
      const rfcIssueStub = require('lodash.merge')(getDefaultRfcIssue(), {
        key: rfcIssueKeyStub,
        fields: {issuetype: {name: 'RFC'}},
      })
      const issues = {}
      issues[RFD_ISSUE_KEY_DLVR_STUB] = getDefaultRfdIssueInfo(RFD_ISSUE_KEY_DLVR_STUB)
      issues[RFD_ISSUE_KEY_TEST_STUB] = getDefaultRfdIssueInfo(RFD_ISSUE_KEY_TEST_STUB)
      issues[RFD_ISSUE_KEY_TEST_BUSINESS_STUB] = getDefaultRfdIssueInfo(RFD_ISSUE_KEY_TEST_BUSINESS_STUB)
      issues[RFD_ISSUE_KEY_PROD_STUB] = getDefaultRfdIssueInfo(RFD_ISSUE_KEY_PROD_STUB)
      jiraClientStub.retrieveRfcIssueInfo.resolves(rfcIssueStub)
      jiraClientStub.getIssue.withArgs(RFD_ISSUE_KEY_DLVR_STUB).resolves(issues[RFD_ISSUE_KEY_DLVR_STUB])
      jiraClientStub.getIssue.withArgs(RFD_ISSUE_KEY_TEST_STUB).resolves(issues[RFD_ISSUE_KEY_TEST_STUB])
      jiraClientStub.getIssue
      .withArgs(RFD_ISSUE_KEY_TEST_BUSINESS_STUB)
      .resolves(issues[RFD_ISSUE_KEY_TEST_BUSINESS_STUB])
      jiraClientStub.getIssue.withArgs(RFD_ISSUE_KEY_PROD_STUB).resolves(issues[RFD_ISSUE_KEY_PROD_STUB])

      // Act
      const env = 'dlvr'
      const dlvrVerifier = new Verifier(getDefaultSettings())
      const dlvrRfcRfdContext = await dlvrVerifier.obtainCurrentRfcRfdContext(env, rfcIssueKeyStub)
      // console.log('dlvrRfcRfdContext', JSON.stringify(dlvrRfcRfdContext));

      // Verify
      sandbox.assert.calledOnce(jiraClientStub.retrieveRfcIssueInfo)
      sandbox.assert.calledWith(jiraClientStub.retrieveRfcIssueInfo, rfcIssueKeyStub)
      const getCalledCount = rfcIssueStub.fields.issuelinks
      .filter(link => link.type.name === ISSUE_LINK_TYPE_NAME.RFC_FRD)
      .reduce((accumulator, link) => {
        return accumulator + 1
      }, 0)
      sandbox.assert.callCount(jiraClientStub.getIssue, getCalledCount)
      expect(dlvrRfcRfdContext.rfcIssueKey).toBe(rfcIssueKeyStub)
      expect(Object.keys(dlvrRfcRfdContext.rfdsByEnv)).toContain(env)
      expect(dlvrRfcRfdContext.rfdsByEnv[env].rfds).toBeInstanceOf(Array)
      dlvrRfcRfdContext.rfdsByEnv[env].rfds.forEach(rfdInfo => {
        expect(rfdInfo.issueKey).toEqual(RFD_ISSUE_KEY_DLVR_STUB)
        expect(rfdInfo.blockedBy).toBeInstanceOf(Array)
        expect(rfdInfo.env).toEqual(env)
        if (rfdInfo.blockedBy) {
          rfdInfo.blockedBy.forEach(blockedByIssue => {
            expect(blockedByIssue.blockingOn).toEqual(rfdInfo.issueKey)
          })
        }
      })
      expect(dlvrRfcRfdContext.rfdsByEnv[env].previousEnvRfds).toBeInstanceOf(Array)
      expect(dlvrRfcRfdContext.rfdsByEnv[env].previousEnvRfds.every(p => p.env === previousEnv(env))).toBe(true)
    })

    it("At 'test' env, With rfc/rfd issues can be found, returns Rfc/Rfd context for caller function", async function () {
      // Arrange
      const rfcIssueKeyStub = 'MyRFCissue-99'
      const rfcIssueStub = require('lodash.merge')(getDefaultRfcIssue(), {
        key: rfcIssueKeyStub,
        fields: {issuetype: {name: 'RFC'}},
      })

      jiraClientStub.retrieveRfcIssueInfo.resolves(rfcIssueStub)
      jiraClientStub.getIssue
      .withArgs(RFD_ISSUE_KEY_DLVR_STUB)
      .resolves(getDefaultRfdIssueInfo(RFD_ISSUE_KEY_DLVR_STUB))
      jiraClientStub.getIssue
      .withArgs(RFD_ISSUE_KEY_TEST_STUB)
      .resolves(getDefaultRfdIssueInfo(RFD_ISSUE_KEY_TEST_STUB))
      jiraClientStub.getIssue
      .withArgs(RFD_ISSUE_KEY_TEST_BUSINESS_STUB)
      .resolves(getDefaultRfdIssueInfo(RFD_ISSUE_KEY_TEST_BUSINESS_STUB))
      jiraClientStub.getIssue
      .withArgs(RFD_ISSUE_KEY_PROD_STUB)
      .resolves(getDefaultRfdIssueInfo(RFD_ISSUE_KEY_PROD_STUB))

      // Act
      const env = 'test'
      const testVerifier = new Verifier(getDefaultSettings())
      const testRfcRfdContext = await testVerifier.obtainCurrentRfcRfdContext(env, rfcIssueKeyStub)
      // console.log('testRfcRfdContext', JSON.stringify(testRfcRfdContext));

      // Verify
      sandbox.assert.calledOnce(jiraClientStub.retrieveRfcIssueInfo)
      sandbox.assert.calledWith(jiraClientStub.retrieveRfcIssueInfo, rfcIssueKeyStub)
      const getCalledCount = rfcIssueStub.fields.issuelinks
      .filter(link => link.type.name === ISSUE_LINK_TYPE_NAME.RFC_FRD)
      .reduce((accumulator, link) => {
        return accumulator + 1
      }, 0)
      sandbox.assert.callCount(jiraClientStub.getIssue, getCalledCount)
      expect(testRfcRfdContext.rfcIssueKey).toBe(rfcIssueKeyStub)
      expect(Object.keys(testRfcRfdContext.rfdsByEnv)).toContain(env)
      expect(testRfcRfdContext.rfdsByEnv[env].rfds).toBeInstanceOf(Array)
      expect(testRfcRfdContext.rfdsByEnv[env].rfds.map(rfd => rfd.issueKey)).toEqual(
        expect.arrayContaining(['RFD-AUTO-TEST-01', 'RFD-BUSINESS-TEST-01']),
      )
      testRfcRfdContext.rfdsByEnv[env].rfds.forEach(rfdInfo => {
        expect(rfdInfo.blockedBy).toBeInstanceOf(Array)
        expect(rfdInfo.env).toEqual(env)
        if (rfdInfo.blockedBy) {
          rfdInfo.blockedBy.forEach(blockedByIssue => {
            expect(blockedByIssue.blockingOn).toEqual(rfdInfo.issueKey)
          })
        }
      })
      expect(testRfcRfdContext.rfdsByEnv[env].previousEnvRfds).toBeInstanceOf(Array)
      expect(testRfcRfdContext.rfdsByEnv[env].previousEnvRfds.every(p => p.env === previousEnv(env))).toBe(true)
    })

    it('When RFC is not found, Error throws', async function () {
      jiraClientStub.retrieveRfcIssueInfo.resolves(undefined)

      // Act
      const verifier = new Verifier(getDefaultSettings())
      return expect(verifier.obtainCurrentRfcRfdContext('dlvr', 'invalidIssueKey')).rejects.toThrow()
    })
  })
})

const RFD_ISSUE_KEY_DLVR_STUB = 'RFD-AUTO-DLVR-01'
const RFD_ISSUE_KEY_TEST_STUB = 'RFD-AUTO-TEST-01'
const RFD_ISSUE_KEY_TEST_BUSINESS_STUB = 'RFD-BUSINESS-TEST-01'
const RFD_ISSUE_KEY_PROD_STUB = 'RFD-AUTO-PROD-01'

// Return default RfdIssueInfo based on previous RFC test setup.
// It generates random RFD status and random 'blckedBy' inwardIssue and its status.
function getDefaultRfdIssueInfo(issueKey) {
  const rfdInfoStub = {
    fields: {
      customfield_10121: {
        value: '',
      },
      status: {
        name: '',
      },
      labels: '',
      issuetype: {name: 'RFD'},
    },
  }

  const rand1 = Math.random()
  let randomRfdStatus
  if (rand1 < 0.3) {
    randomRfdStatus = RFDWORKFLOW.STATUS_CLOSED.name
  } else if (rand1 >= 0.3 && rand1 < 0.7) {
    randomRfdStatus = RFDWORKFLOW.STATUS_APPROVED.name
  } else {
    randomRfdStatus = RFDWORKFLOW.STATUS_RESOLVED.name
  }

  // constructing rfdIssue status, customfield.
  switch (issueKey) {
  case RFD_ISSUE_KEY_DLVR_STUB:
    rfdInfoStub.fields.customfield_10121.value = ENV.DLVR
    rfdInfoStub.fields.status.name = randomRfdStatus
    rfdInfoStub.fields.labels = 'auto'
    break
  case RFD_ISSUE_KEY_TEST_STUB:
    rfdInfoStub.fields.customfield_10121.value = ENV.TEST
    rfdInfoStub.fields.status.name = randomRfdStatus
    rfdInfoStub.fields.labels = 'auto'
    break
  case RFD_ISSUE_KEY_TEST_BUSINESS_STUB:
    rfdInfoStub.fields.customfield_10121.value = ENV.TEST
    rfdInfoStub.fields.status.name = randomRfdStatus
    rfdInfoStub.fields.labels = 'some-label'
    break
  case RFD_ISSUE_KEY_PROD_STUB:
    rfdInfoStub.fields.customfield_10121.value = ENV.PROD
    rfdInfoStub.fields.status.name = randomRfdStatus
    rfdInfoStub.fields.labels = 'auto'
    break
  }

  // constructing rfd blockedBy issueLinks
  const isBlockedBy = Math.random() >= 0.5
  if (isBlockedBy) {
    const num = Math.floor(Math.random() * 3) + 1 // num between 1..n
    const rfdIssueLinks = []
    for (let i = 0; i < num; i++) {
      const inwardIssueKey = `INWARDISSUE-${i}`
      const inwardIssueStatus = Math.random() >= 0.5 ? RFDWORKFLOW.STATUS_RESOLVED.name : 'Some Other Status'
      const issueLink = {
        type: {inward: 'is blocked by'},
        inwardIssue: {key: inwardIssueKey, fields: {status: {name: inwardIssueStatus}}},
      }
      rfdIssueLinks.push(issueLink)
    }
    rfdInfoStub.fields.issuelinks = rfdIssueLinks
  }
  // console.log('rfdInfoStub:', JSON.stringify(rfdInfoStub));
  return rfdInfoStub
}

// Return default test object for RFC with issuelinks
// Note, changing default setup could affect tests result.
function getDefaultRfcIssue() {
  const rfdIssueLinkInfoWithRfcRfdTypeStub = {
    type: {
      name: ISSUE_LINK_TYPE_NAME.RFC_FRD,
    },
    outwardIssue: {
      key: '',
    },
  }

  const dlrvAutoRfdIssueLink = JSON.parse(JSON.stringify(rfdIssueLinkInfoWithRfcRfdTypeStub))
  dlrvAutoRfdIssueLink.outwardIssue.key = RFD_ISSUE_KEY_DLVR_STUB
  const testAutoRfdIssueLink = JSON.parse(JSON.stringify(rfdIssueLinkInfoWithRfcRfdTypeStub))
  testAutoRfdIssueLink.outwardIssue.key = RFD_ISSUE_KEY_TEST_STUB
  const testBusinessCreatedRfdIssueLink = JSON.parse(JSON.stringify(rfdIssueLinkInfoWithRfcRfdTypeStub))
  testBusinessCreatedRfdIssueLink.outwardIssue.key = RFD_ISSUE_KEY_TEST_BUSINESS_STUB
  const prodAutoRfdIssueLink = JSON.parse(JSON.stringify(rfdIssueLinkInfoWithRfcRfdTypeStub))
  prodAutoRfdIssueLink.outwardIssue.key = RFD_ISSUE_KEY_PROD_STUB

  const rfdIssueLinkInfoWithNonRfcRfdTypeStub = {
    type: {
      name: 'NON_RFC_RFD_TYPE',
    },
  }

  const rfcIssueStub = {
    fields: {
      status: RFCWORKFLOW.STATUS_APPROVED,
      issuelinks: [
        dlrvAutoRfdIssueLink,
        testAutoRfdIssueLink,
        testBusinessCreatedRfdIssueLink,
        prodAutoRfdIssueLink,
        rfdIssueLinkInfoWithNonRfcRfdTypeStub,
      ],
    },
  }

  // console.log('rfcIssueStub:', JSON.stringify(rfcIssueStub));
  return rfcIssueStub
}

function getDefaultSettings() {
  const defaultSettings = {
    phases: {
      build: {
        namespace: 'wp9gel-tools',
        phase: 'build',
        tag: 'build-1.0-1',
      },
      dlvr: {
        namespace: 'wp9gel-dev',
        name: 'wiof',
        phase: 'dev',
        changeId: '99',
        tag: 'dev-1.0',
        instance: 'wiof-dlvr',
        transient: false,
        host: 'wiof-dlvr-wp9gel-dev.pathfinder.bcgov',
        credentials: {
          idir: {
            user: 'stub@gov.bc.ca',
            pass: 'stub',
          },
        },
      },
      test: {
        namespace: 'wp9gel-test',
        name: 'wiof',
        phase: 'test',
        changeId: '99',
        tag: 'test-1.0',
        instance: 'wiof-test',
        transient: false,
        host: 'siwe-test-wp9gel-test.pathfinder.bcgov',
        credentials: {
          idir: {
            user: 'fake@gov.bc.ca',
            pass: 'fakePass',
          },
        },
      },
    },
    options: {
      git: {
        branch: {
          name: 'master',
          merge: 'MyRFCissue-99',
          remote: 'master',
        },
        url: 'https://bwa.nrs.gov.bc.ca/int/stash/scm/siwe/siwe-siwe-ear.git',
        dir: '/Users/iliu/Workspace/Repo/spi/spi-siwe-ear',
        uri: 'https://bwa.nrs.gov.bc.ca/int/stash/scm/siwe/siwe-siwe-ear.git',
        http_url: 'https://bwa.nrs.gov.bc.ca/int/stash/scm/siwe/siwe-siwe-ear.git',
        owner: 'SIWE',
        repository: 'siwe-siwe-ear',
      },
      env: 'dlvr',
      pr: '99',
      cwd: '/some/user/Workspace/Repo/spi/spi-siwe-ear',
    },
    jiraUrl: 'bwa.nrs.gov.bc.ca/int/jira',
    bitbucketUrl: 'https://bwa.nrs.gov.bc.ca/int/stash',
    phase: 'dlvr',
  }
  return defaultSettings
} // getDefaultSettings
