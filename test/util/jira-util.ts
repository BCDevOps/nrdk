
import merge from 'lodash.merge'
import {AxiosJiraClient} from '../../src/api/service/axios-jira-client'

export async function cleanUpTestCase(jira: AxiosJiraClient, testCaseId: string, projectKey: string) {
  if (process.env.NOCK_BACK_MODE === 'lockdown') return Promise.resolve(true)
  // Delete issues
  await jira.search({jql: `labels = ${testCaseId}`, fields: 'key', maxResults: 100})
  .then(async result => {
    for (const issue of result.issues) {
      // eslint-disable-next-line no-await-in-loop
      await jira.deleteIssue({issueIdOrKey: issue.key, deleteSubtasks: 'true'})
    }
  })
  // Delete Versions
  await jira.client.get(`/rest/api/2/project/${projectKey}/versions`)
  .then(async result => {
    // eslint-disable-next-line no-console
    for (const version of result.data) {
      if (version.name && (version.name as string).startsWith(testCaseId)) {
        // eslint-disable-next-line no-await-in-loop
        await jira.client.delete(`/rest/api/2/version/${version.id}`)
      }
    }
  })
  // Delete components
  await jira.client.get(`/rest/api/2/project/${projectKey}/components`)
  .then(async result => {
    // eslint-disable-next-line no-console
    for (const component of result.data) {
      if (component.name === testCaseId) {
        // eslint-disable-next-line no-await-in-loop
        await jira.client.delete(`/rest/api/2/component/${component.id}`)
      }
    }
  })
}
export async function createRFC(jira: AxiosJiraClient, issue: any) {
  if (!issue?.fields?.project?.key) throw new Error('Missing issue "fields.project.key" field')
  if (!issue?.fields?.labels) throw new Error('Missing issue "fields.labels" field')
  if (!issue?.fields?.summary) throw new Error('Missing issue "fields.summary" field')

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultIssue = {
    fields: {
      issuetype: {name: 'RFC'},
      description: 'Something important that needs to be done',
      customfield_10117: 'Something', // High Level Technical Deliverables
      customfield_11300: {value: 'Low'}, // Likelihood
      customfield_11301: {value: 'Low'}, // Impact
      customfield_10103: {value: 'Infrastructure Change'}, // RFC Category
      customfield_12202: {value: 'Yes'}, // Automated/Pipeline
      customfield_10107: tomorrow.toISOString().slice(0, -1) + '-0700', // Requested Production Deployment Date
    },
  }
  merge(defaultIssue, issue)
  return jira.createIssue(defaultIssue)
}
