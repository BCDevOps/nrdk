import {AxiosInstance} from 'axios'
import {AxiosBitBucketClient} from './axios-bitbucket-client'

type Issue = any

export const FIELDS = Object.freeze({
  ISSUE_TYPE: 'issuetype',
})
export class AxiosJiraClient {
  readonly client: AxiosInstance

  constructor(client: AxiosInstance) {
    this.client = client
  }

  public async getIssue(issueKey: string, params?: any): Promise<Issue> {
    return this.client.get(`rest/api/2/issue/${issueKey}`, {params: params})
    .then(response => {
      return response.data
    })
  }

  public getBranches(issueId: string, params?: any) {
    return this.client.get('rest/dev-status/1.0/issue/detail', {params: Object.assign({}, params, {issueId: issueId, applicationType: 'stash', dataType: 'pullrequest'})}).then(response => {
      return response.data.detail[0]
    })
  }

  public async getRfcByIssue(issueKey: string): Promise<Issue> {
    const issue = await this.getIssue(issueKey, {fields: 'fixVersions'})
    if (issue.fields.fixVersions.length === 0) {
      throw new Error(`Expected to find at least '1' value for fix version, but found '${issue.fields.fixVersions.length}' for issue ${issueKey}`)
    }
    const fixVersion = issue.fields.fixVersions[0]
    const jql = `fixVersion  = ${fixVersion.id} AND issuetype = RFC AND statusCategory != Done`
    const rfcSearchResults = await this.client.get('rest/api/2/search', {params: {fields: 'issuetype,project', jql: jql}}).then(response => {
      return response.data
    })
    if (rfcSearchResults.total !== 1) {
      throw new Error(`Expected to find '1' RFC, but found '${rfcSearchResults.total}' when searching for '${jql}`)
    }
    return rfcSearchResults.issues[0]
    // fixVersions
  }

  public async getComponentRepositoryInfo(component: any) {
    try {
      return await AxiosBitBucketClient.parseUrl(component.description)
    } catch (error) {
      throw new Error(`Unable to parse component description for ${component.name}`)
    }
  }
}
