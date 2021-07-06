/* eslint-disable unicorn/no-process-exit */
import {Issue, IssueTypeNames} from '../api/model/jira'
import {AxiosBitBucketClient} from '../api/service/axios-bitbucket-client'
import {RfdHelper} from '../util/rfd-helper'
import axios from 'axios'
import {resolve} from 'path'
import {readFileSync} from 'fs'
import {LoggerFactory} from '../util/logger'

export interface JiraWebhookEvent {
  type: string;
  payload: any;
}
const logger = LoggerFactory.createLogger('JiraEventHandler')
export class JiraEventHandler {
  async executeJenkinsGroovyScript(script: string): Promise<string> {
    if (!process.env.__SECRET_JENKINS_URL) throw new Error('Missing `__SECRET_JENKINS_URL` environment variable')
    if (!process.env.__SECRET_JENKINS_USERNAME) throw new Error('Missing `__SECRET_JENKINS_USERNAME` environment variable')
    if (!process.env.__SECRET_JENKINS_PASSWORD) throw new Error('Missing `__SECRET_JENKINS_PASSWORD` environment variable')
    const libAsString = readFileSync(resolve(__dirname, './lib.groovy'), {encoding: 'utf8'})
    const client = axios.create({
      baseURL: process.env.__SECRET_JENKINS_URL,
      timeout: 20000,
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.__SECRET_JENKINS_USERNAME + ':' + process.env.__SECRET_JENKINS_PASSWORD, 'utf8').toString('base64')}`,
      },
    })
    client.interceptors.request.use(request => {
      logger.info(`> ${request.method} - ${request.url}`)
      return request
    })
    client.interceptors.response.use(response => {
      logger.info(`< ${response.request.method} - ${response.config.url} - ${response.status}`)
      return response
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
    logger.info(`Approving pipeline input: project: ${bitBucketProjectName}', repository: '${bitBucketRepositoryName}', input:'${inputId}'`)
    return this.executeJenkinsGroovyScript(`approveBuildInput('${bitBucketProjectName}', '${bitBucketRepositoryName}', '${pullRequestNumber}', '${inputId}')`)
  }

  async processPayloadFromFile(pathToAJsonPayloadFile: string) {
    // eslint-disable-next-line no-console
    console.log(`Processing payload from file: ${pathToAJsonPayloadFile}`)
    const payload = require(pathToAJsonPayloadFile)
    return this.process(payload as JiraWebhookEvent)
  }

  async processPayloadFromText(payloadAsText: string) {
    const payload: any = JSON.parse(payloadAsText)
    return this.process(payload)
  }

  async process(event: JiraWebhookEvent): Promise<{errors: readonly any[]; issues: readonly any[]}> {
    return this._process(event, event.payload as Issue)
  }

  async _process(event: JiraWebhookEvent, issue: Issue): Promise<{errors: readonly any[]; issues: readonly any[]}> {
    const helper = new RfdHelper()
    logger.info(`Processing payload event: ${event.type}`)
    // eslint-disable-next-line no-console
    console.log(`Processing payload for issue: ${issue.key}`)
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
      // eslint-disable-next-line no-console
      console.log(`Listing Pending Inputs from Jenkins: getPendingInput('${bitBucketRepository.project.key}', '${bitBucketRepository.slug}', '${pullRequestNumber}')`)
      const waitingInputId = (await this.getPendingInput(bitBucketRepository.project.key, bitBucketRepository.slug, pullRequestNumber)).toUpperCase()
      // eslint-disable-next-line no-console
      console.log(` expectedInputId:'${expectedInputId}', waitingInputId: '${waitingInputId}'`)
      if (waitingInputId !== expectedInputId) {
        // fallback to look for RFD for the specific waiting input
        // It may have reveived events out of order, e.g.: Close RFD to DLVR after approving RFD to TEST
        const waitingEnvironment = waitingInputId.substr('Jira-'.length)
        // eslint-disable-next-line no-console
        console.log(`Fallback event as environment ${waitingEnvironment}`)
        const issue2 = await helper.search({
          fields: 'issuetype,customfield_10121,',
          jql: `issue in linkedIssues("${rfc.key}", "RFC link to RFD") and statusCategory != Done and "Target environment" = "${waitingEnvironment}"`,
          maxResults: 1,
        })
        .then(async result => {
          if (result.issues.length > 0) return result.issues[0] as Issue
          return null
        })
        if (issue2) {
          // eslint-disable-next-line no-console
          console.log(`Fowarding event to RFD ${issue2.key}`)
          return this._process(event, issue2 as Issue)
        }
        throw new Error(`Pipeline is waiting on input '${waitingInputId}', but received ${expectedInputId}`)
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
      helper.print(result.issues)
      if (result.errors && result.errors.length > 0) {
        // eslint-disable-next-line no-console
        for (const error of result.errors as any[]) {
          // eslint-disable-next-line no-console
          console.error(error.cause)
        }
        return {errors: result.errors, issues: []}
      }
      await this.approveInput(bitBucketRepository.project.key, bitBucketRepository.slug, pullRequestNumber, waitingInputId)
    }
    return {errors: [], issues: []}
  }
}
