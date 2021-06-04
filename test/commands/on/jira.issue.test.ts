import {expect as mExpect, test} from '@oclif/test'
import {FlagNames} from '../../../src/flags'
import * as path from 'path'
import * as jExpect from 'expect'
import {toMatchSnapshot} from '../../util/expect-mocha-snapshot'
jExpect.extend({toMatchSnapshot})
import * as nock from 'nock'
import {saveJiraRequests} from '../../util/record-jira-requests'
import RfcWorkflow from '../../../src/util/jira-rfc-workflow-v2.0.0'
import RfdWorkflow from '../../../src/util/jira-rfd-workflow-v1.2.2'

const _merge = require('lodash.merge')
const recordJiraRequests = false

describe.skip('on/jira.issue', () => {
  const RFC2127 = require('../../__mocks/ZERO-2127.json')
  const RFD2131 = require('../../__mocks/ZERO-2131.json')

  beforeEach(function () {
    // runs before each test in this block
    if (!nock.isActive()) nock.activate()
    if (recordJiraRequests) {
      nock.recorder.rec({dont_print: true, output_objects: true})
    } else {
      nock.disableNetConnect()
    }
  })

  afterEach(function () {
    // runs after each test in this block
    nock.restore()
    nock.cleanAll()
    if (recordJiraRequests) {
      saveJiraRequests((nock.recorder.play() as unknown) as nock.Definition[])
    }
  })

  for (const rfcStatus of RfcWorkflow.ALL_STATUS) {
    for (const rfdStatus of RfdWorkflow.ALL_STATUS) {
      if (rfcStatus.name === RfcWorkflow.STATUS_APPROVED.name && rfdStatus.name === RfdWorkflow.STATUS_APPROVED.name) {
        // READY cases
        test
        .nock(`${RFC2127.scope}`, api => api.get(RFC2127.path).reply(200, () => {
          return _merge({}, RFC2127.response, {fields: {status: rfcStatus}})
        })
        .get(RFD2131.path)
        .reply(200, () => {
          return _merge({}, RFD2131.response, {fields: {status: rfdStatus}})
        }))
        .stdout()
        .stderr()
        .command([
          'on:jira.issue',
          `--${FlagNames.CONFIG_SCRIPT}=${path.resolve(__dirname, '../build.config.js')}`,
          `--${FlagNames.GIT_BRANCH_REMOTE}=${RFC2127.response.key}-fix-title-color`,
          `--${FlagNames.GIT_REMOTE_URL}=some-remote-url`,
          `--${FlagNames.ENV}=dlvr`,
        ])
        .exit(0)
        .it(`RFC-${rfcStatus.name.toUpperCase()},RFD-${rfdStatus.name.toUpperCase()}-READY`, ctx => {
          mExpect(ctx.stdout.split('\n')).to.include.members(['=>   READY'])
        })
      } else if (rfcStatus.name === RfcWorkflow.STATUS_APPROVED.name && rfdStatus.name === RfdWorkflow.STATUS_RESOLVED.name) {
        // NOT READY cases
        test
        .stdout()
        .stderr()
        .nock(
          `${RFC2127.scope}`, api => api.get(RFC2127.path).reply(200, () => {
            return _merge({}, RFC2127.response, {fields: {status: RfcWorkflow.STATUS_APPROVED}})
          })
          .get(RFD2131.path)
          .reply(200, () => {
            return _merge({}, RFD2131.response, {fields: {status: RfdWorkflow.STATUS_RESOLVED}})
          })
        )
        .command([
          'on:jira.issue',
          `--${FlagNames.CONFIG_SCRIPT}=${path.resolve(__dirname, '../build.config.js')}`,
          `--${FlagNames.GIT_BRANCH_REMOTE}=${RFC2127.response.key}-fix-title-color`,
          `--${FlagNames.GIT_REMOTE_URL}=some-remote-url`,
          `--${FlagNames.ENV}=dlvr`,
        ])
        .exit(0)
        .it(`RFC-${rfcStatus.name.toUpperCase()},RFD-${rfdStatus.name.toUpperCase()}-NOT_READY`, ctx => {
          mExpect(ctx.stdout.split('\n')).to.include.members(['=>   READY'])
        })
      } else {
        it.skip(`RFC-${rfcStatus.name.toUpperCase()},RFD-${rfdStatus.name.toUpperCase()}-MISSING`, () => {
          mExpect(1).to.be.equal(1)
        })
      }
    }
  }
})
