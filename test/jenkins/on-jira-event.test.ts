import {Context} from 'mocha'
import axios from 'axios'
import {expect} from 'chai'
import FormData  from 'form-data'
import {JiraEventHandler, JiraWebhookEvent} from '../../src/jenkins/on-jira-event'
import {SecretManager} from '../../src/api/service/secret-manager'
import {LoggerFactory} from '../../src/util/logger'

describe('On Jira Event @type=system', function () {
  SecretManager.loadEntries(require('../.local/secrets.json'))
  it('hello 1', async function (this: Context) {
    const config = require('../.local/jenkins-config.json')
    const client = axios.create({
      baseURL: config.baseURL,
      timeout: 10000,
      headers: {
        Authorization: `Basic ${Buffer.from(config.username + ':' + config.password, 'utf8').toString('base64')}`,
      },
    })
    await client.post('/scriptText', null, {params: {script: 'println "Hello World!";'}})
    .then(response => {
      expect(response.data).eql('Hello World!\n')
    })
  })
  it.skip('hello 2', async function (this: Context) {
    const config = require('../.local/jenkins-config.json')
    const client = axios.create({
      baseURL: config.baseURL,
      timeout: 10000,
      headers: {
        Authorization: `Basic ${Buffer.from(config.username + ':' + config.password, 'utf8').toString('base64')}`,
      },
    })
    const form = new FormData()
    form.append('script', 'println "Hello World!";')
    await client.post('/scriptText', null, {headers: form.getHeaders()})
    .then(response => {
      expect(response.data).eql('Hello World!\n')
    })
  })
  it('receive event', async function (this: Context) {
    LoggerFactory.ROOT.level = 'DEBUG'
    const handler = new JiraEventHandler()
    const event = {
      type: 'issue_updated',
      payload: {
        key: 'IRS-267',
        fields: {
          issuetype: {name: 'RFD'},
          customfield_10121: {value: 'DLVR'},
        },
      },
    } as JiraWebhookEvent
    const result = await handler.process(event)
    expect(result?.errors).to.have.lengthOf(0)
  })
})
