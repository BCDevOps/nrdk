import {AxiosInstance} from 'axios'
import {AxiosBitBucketClient} from './axios-bitbucket-client'
import {GeneralError} from '../../error'

export type Issue = any

export const FIELDS = Object.freeze({
  ISSUE_TYPE: 'issuetype',
})
export class AxiosJiraClient {
  // eslint-disable-next-line no-useless-escape
  private static JIRA_ISSUE_KEY_REGEX = /(?<issueKey>\w+-\d+)/gm;

  readonly client: AxiosInstance

  constructor(client: AxiosInstance) {
    this.client = client
  }

  public static async parseJiraIssueKeyFromUri(uri: string) {
    const m = AxiosJiraClient.JIRA_ISSUE_KEY_REGEX.exec(uri)
    if (!m) throw new Error(`Unable to parse Jira issue key from '${uri}'`)
    const issueKey = m.groups?.issueKey as string
    return issueKey
  }

  public async getIssue(issueKey: string, params?: any): Promise<Issue> {
    return this.client.get(`rest/api/2/issue/${issueKey}`, {params: params})
    .then(response => {
      return response.data
    })
  }

  public getBranches(issueId: string, params?: any) {
    return this.client.get('rest/dev-status/1.0/issue/detail', {params: {...params, issueId: issueId, applicationType: 'stash', dataType: 'pullrequest'}}).then(response => {
      return response.data.detail[0]
    }).catch(error => {
      if (error?.response?.status === 403) {
        throw new GeneralError(`Access denied retrieving development feature for issue ${issueId}. Verify you have "developer" role in the project`, error)
      }
      throw error
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
