/* eslint-disable unicorn/no-process-exit */
import {Issue, IssueTypeNames} from '../api/model/jira'
import {AxiosBitBucketClient} from '../api/service/axios-bitbucket-client'
import {RfdHelper} from '../util/rfd-helper'
import axios from 'axios'
import {resolve} from 'path'
import {readFileSync} from 'fs'

export interface JiraWebhookEvent {
  type: string;
  payload: any;
}

export class JiraEventHandler {
  async executeJenkinsGroovyScript(script: string): Promise<string> {
    if (!process.env.__SECRET_JENKINS_URL) throw new Error('Missing `__SECRET_JENKINS_URL` environment variable')
    if (!process.env.__SECRET_JENKINS_USERNAME) throw new Error('Missing `__SECRET_JENKINS_USERNAME` environment variable')
    if (!process.env.__SECRET_JENKINS_PASSWORD) throw new Error('Missing `__SECRET_JENKINS_PASSWORD` environment variable')
    const libAsString = readFileSync(resolve(__dirname, './lib.groovy'), {encoding: 'utf8'})
    const client = axios.create({
      baseURL: process.env.__SECRET_JENKINS_URL,
      timeout: 10000,
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.__SECRET_JENKINS_USERNAME + ':' + process.env.__SECRET_JENKINS_PASSWORD, 'utf8').toString('base64')}`,
      },
    })
    return client.post('/scriptText', null, {params: {script: libAsString + '\n' + script}})
    .then(response => {
      return (response.data as string).trim()
    })
  }

  async getPendingInput(bitBucketProjectName: string, bitBucketRepositoryName: string, pullRequestNumber: number): Promise<string> {
    let attempts = 0
    while (attempts <= 5) { // 10 attempts with exponential backoff
      // eslint-disable-next-line no-await-in-loop
      const inputId = (await this.executeJenkinsGroovyScript(`listPendingBuildInput('${bitBucketProjectName}', '${bitBucketRepositoryName}', '${pullRequestNumber}')`)).trim()
      if (inputId && inputId.length > 0) {
        return inputId
      }
      // exponential backoff: 0, 800, 1600, 2400, 3200, 4000
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => {
        setTimeout(() => {
          resolve(true)
        }, 800 * (0 ^ attempts))
      })
      attempts++
    }
    return ''
  }

  async approveInput(bitBucketProjectName: string, bitBucketRepositoryName: string, pullRequestNumber: number, inputId: string): Promise<string> {
    return this.executeJenkinsGroovyScript(`approveBuildInput('${bitBucketProjectName}', '${bitBucketRepositoryName}', '${pullRequestNumber}', '${inputId}')`)
  }

  async processPayloadFromFile(path: string) {
    const payload = require(path)
    return this.process(payload)
  }

  async processPayloadFromText(payloadAsText: string) {
    const payload: any = JSON.parse(payloadAsText)
    return this.process(payload)
  }

  async process(event: JiraWebhookEvent): Promise<{errors: readonly any[]; issues: readonly any[]}> {
    const issue = event.payload as Issue
    const helper = new RfdHelper()
    if (issue.fields?.issuetype?.name === IssueTypeNames.RFD) {
      const jira = await helper.createJiraClient()
      const rfc = await helper.getRfcByIssue(issue.key as string)
      const devStatus: any = await jira.getBranches(rfc.id)
      const pullRequest = (devStatus.pullRequests as any[]).find(value => value.status === 'OPEN')
      const bitBucketRepository = AxiosBitBucketClient.parseUrl(pullRequest.url)
      const pullRequestNumber = parseInt(pullRequest.id.substr(1), 10)
      const targetEnvironment = issue.fields.customfield_10121?.value
      const expectedInputId = `Jira-${targetEnvironment}`.toUpperCase()
      // if there are no errors, send approval to Jenkins
      const waitingInputId = (await this.getPendingInput(bitBucketRepository.project.key, bitBucketRepository.slug, pullRequestNumber)).toUpperCase()
      // eslint-disable-next-line no-console
      console.log(`waitingInputId:${waitingInputId}`)
      if (waitingInputId !== expectedInputId) {
        throw new Error(`Pipeline is waiting on input '${waitingInputId}', but received Jira-${expectedInputId}`)
      }
      const result = await helper.deploymentStarted({
        issue: {key: rfc.key},
        pullRequest: {
          url: pullRequest.url,
          number: pullRequestNumber.toString(10),
          sourceBranch: pullRequest.source.branch,
          targetBranch: pullRequest.destination.branch,
          repository: bitBucketRepository,
        },
        targetEnvironment: issue.fields?.customfield_10121?.value as string,
        dryrun: true,
      })
      if (result.errors && result.errors.length > 0) {
        // eslint-disable-next-line no-console
        for (const error of result.errors as any[]) {
          // eslint-disable-next-line no-console
          console.error(error.cause)
        }
      }
      await this.approveInput(bitBucketRepository.project.key, bitBucketRepository.slug, pullRequestNumber, waitingInputId)
    }
    return {errors: [], issues: []}
  }
}
