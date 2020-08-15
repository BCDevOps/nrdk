import {expect as mExpect, test} from '@oclif/test'
import {FlagNames} from '../../../src/flags'
import * as path from 'path'
import * as jExpect from 'expect'
import {toMatchSnapshot} from '../../util/expect-mocha-snapshot'
jExpect.extend({toMatchSnapshot})
import * as nock from 'nock'
import {saveJiraRequests} from '../../util/record-jira-requests'
import {RfcWorkflow, RfdWorkflow} from 'nr-pipeline-ext'

const _merge = require('lodash.merge')
const recordJiraRequests = false

describe('on/jira.issue', () => {
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

  test
  .nock(`${RFC2127.scope}`, api => api.get(RFC2127.path).reply(200, () => {
    return _merge({}, RFC2127.response, {fields: {status: RfcWorkflow.STATUS_APPROVED}})
  }).get(RFD2131.path).reply(200, () => {
    return _merge({}, RFD2131.response, {fields: {status: RfdWorkflow.STATUS_APPROVED}})
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
  .it('RFC-Approved,RFD-Approved', ctx => {
    mExpect(ctx.stdout.split('\n')).to.include.members(['=>   READY'])
  })

  test
  .stdout()
  .stderr()
  .nock(`${RFC2127.scope}`, api => api.get(RFC2127.path).reply(200, () => {
    return _merge({}, RFC2127.response, {fields: {status: RfcWorkflow.STATUS_APPROVED}})
  }).get(RFD2131.path).reply(200, () => {
    return _merge({}, RFD2131.response, {fields: {status: RfdWorkflow.STATUS_RESOLVED}})
  }))
  .command([
    'on:jira.issue',
    `--${FlagNames.CONFIG_SCRIPT}=${path.resolve(__dirname, '../build.config.js')}`,
    `--${FlagNames.GIT_BRANCH_REMOTE}=${RFC2127.response.key}-fix-title-color`,
    `--${FlagNames.GIT_REMOTE_URL}=some-remote-url`,
    `--${FlagNames.ENV}=dlvr`,
  ])
  .exit(1)
  .it('RFC-Approved,RFD-Resolved', ctx => {
    mExpect(ctx.stdout.split('\n')).to.include.members(['=>    NOT READY'])
  })
})
