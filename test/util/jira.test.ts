'use strict'
import {Jira} from '../../src/util/jira'
import {createSandbox} from 'sinon'
const sandbox = createSandbox()
import {isActive, activate, disableNetConnect, restore, cleanAll} from 'nock'
import expect, {extend} from 'expect'
import {toMatchSnapshot} from './expect-mocha-snapshot'
extend({toMatchSnapshot})

import {STATUS_RESOLVED} from '../../src/util/jira-rfd-workflow-v1.2.2'
import {STATUS_APPROVED} from '../../src/util/jira-rfc-workflow-v2.0.0'
import {ENV} from '../../src/util/constants'
import {JiraMock} from './jira-mock'
import {Context, Suite} from 'mocha'

const JIRA_SETTINGS = {
  url: 'bwa.nrs.gov.bc.ca/int/jira',
  username: 'fake',
  password: 'fake',
  rfcIssueKey: 'FAKE-123',
  changeBranch: 'FAKE-123-rfc',
  branchName: 'PR-456',
  repoName: 'FAKE',
  projectName: 'FAKE',
  version: '1.0.0',
}

describe('Jira @jira', function () {
  beforeEach('Using fake settings to create JIRA object', function () {
    if (!isActive()) {
      activate()
    }
    disableNetConnect()
  })
  afterEach('Completely restore all fakes created through the sandbox', function () {
    sandbox.restore()
    restore()
    cleanAll()
  })
  describe('RFDs and RFD-Subtasks', function (this: Suite) {
    it('create', async function (this: Context) {
      const jira = new Jira(Object.assign({}, {phase: 'jira-update', jira: JIRA_SETTINGS}))
      const jiraMock = new JiraMock(jira)
      // RFC already exists
      jiraMock._addIssue({
        key: 'FAKE-123',
        fields: {
          fixVersions: ['0.0.0'],
          issuetype: {id: '10400', name: 'RFC'},
        },
      })
      jiraMock.start()

      await expect(jira.createRFD()).resolves.toBe(true)
      expect([...jiraMock.issues.values()]).toHaveLength(7)
      // console.dir(Array.from(issues.values()), { depth: 4 })
      expect([...jiraMock.issues.values()]).toMatchSnapshot(this as any, 'a7c66bfb-a011-4adc-9b10-6dda737a2d5b')
      expect(jiraMock.links).toHaveLength(3)
      // console.dir(links)
      expect(jiraMock.links).toMatchSnapshot(this as any, '72829b90-f2e8-4569-92d8-10a7c889c8cc')
    })
    it.skip('update', async function () {
      const initialState = [
        {
          key: 'FAKE-123',
          fields: {
            fixVersions: ['0.0.0'],
            issuetype: {id: '10400', name: 'RFC'},
            status: STATUS_APPROVED,
            issuelinks: [
              {
                inwardIssue: {key: 'FAKE-123'},
                outwardIssue: {key: 'FAKE-1000'},
                type: {id: '10300'},
              },
              {
                inwardIssue: {key: 'FAKE-123'},
                outwardIssue: {key: 'FAKE-1002'},
                type: {id: '10300'},
              },
              {
                inwardIssue: {key: 'FAKE-123'},
                outwardIssue: {key: 'FAKE-1004'},
                type: {id: '10300'},
              },
            ],
          },
        },
        {
          fields: {
            project: {key: 'FAKE'},
            issuetype: {name: 'RFD'},
            customfield_10121: {value: 'DLVR'},
            labels: ['FAKE', 'auto'],
            fixVersions: [{}],
            description: 'Deploying changes from PR NO: PR-456 in REPO: FAKE',
            summary: 'RFD-DLVR-FAKE-123-rfc-PR-456',
            status: STATUS_RESOLVED,
          },
          key: 'FAKE-1000',
        },
        {
          fields: {
            project: {key: 'FAKE'},
            issuetype: {name: 'RFD-subtask'},
            customfield_10121: {value: 'DLVR'},
            parent: {key: 'FAKE-1000'},
            summary: 'RFD-Subtask-DLVR-FAKE-123-rfc-PR-456-Developer-Review',
            components: [{name: 'FAKE'}],
            status: STATUS_RESOLVED,
          },
          key: 'FAKE-1001',
        },
        {
          fields: {
            project: {key: 'FAKE'},
            issuetype: {name: 'RFD'},
            customfield_10121: {value: 'TEST'},
            labels: ['FAKE', 'auto'],
            fixVersions: [{}],
            description: 'Deploying changes from PR NO: PR-456 in REPO: FAKE',
            summary: 'RFD-TEST-FAKE-123-rfc-PR-456',
            status: STATUS_RESOLVED,
          },
          key: 'FAKE-1002',
        },
        {
          fields: {
            project: {key: 'FAKE'},
            issuetype: {name: 'RFD-subtask'},
            customfield_10121: {value: 'TEST'},
            parent: {key: 'FAKE-1002'},
            summary: 'RFD-Subtask-TEST-FAKE-123-rfc-PR-456-IIT-Review',
            components: [{name: 'FAKE'}],
            status: STATUS_RESOLVED,
          },
          key: 'FAKE-1003',
        },
        {
          fields: {
            project: {key: 'FAKE'},
            issuetype: {name: 'RFD'},
            customfield_10121: {value: 'PROD'},
            labels: ['FAKE', 'auto'],
            fixVersions: [{}],
            description: 'Deploying changes from PR NO: PR-456 in REPO: FAKE',
            summary: 'RFD-PROD-FAKE-123-rfc-PR-456',
            status: STATUS_RESOLVED,
          },
          key: 'FAKE-1004',
        },
        {
          fields: {
            project: {key: 'FAKE'},
            issuetype: {name: 'RFD-subtask'},
            customfield_10121: {value: 'PROD'},
            parent: {key: 'FAKE-1004'},
            summary: 'RFD-Subtask-PROD-FAKE-123-rfc-PR-456-Business-Review',
            components: [{name: 'FAKE'}],
            status: STATUS_RESOLVED,
          },
          key: 'FAKE-1005',
        },
      ]
      const jira = new Jira(Object.assign({}, {phase: 'jira-update', jira: JIRA_SETTINGS}))
      const jiraMock = new JiraMock(jira)
      jiraMock.start()
      jiraMock._addIssue(initialState)
      expect(await jira.createRFD()).toBe(true)
      // console.dir(JSON.stringify(Array.from(jiraMock.issues.values())))
      await expect([...jiraMock.issues.values()]).toMatchSnapshot(
        this as any,
        '3e7704c4-f8d6-44f5-8473-4c7a0c094633'
      )

      await jira.transitionRFDpostDeployment(ENV.DLVR)
      await jira.transitionRFDpostDeployment(ENV.TEST)
      await jira.transitionRFDpostDeployment(ENV.PROD)
    })
  })
})
