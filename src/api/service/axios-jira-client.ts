import {AxiosInstance} from 'axios'
import {AxiosBitBucketClient} from './axios-bitbucket-client'
import {GeneralError} from '../../error'
import {IssueReference} from '../model/jira'

export type Issue = {key: string; id: string; fields: any}

export const FIELDS = Object.freeze({
  ISSUE_TYPE: 'issuetype',
})
export class AxiosJiraClient {
  // eslint-disable-next-line no-useless-escape
  private static JIRA_ISSUE_KEY_REGEX = /(?<issueKey>\w+-\d+)/m;

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

  public async deleteIssue(params: {issueIdOrKey: string; deleteSubtasks?: string}) {
    return this.client.delete(`rest/api/2/issue/${params.issueIdOrKey}`, {params: {deleteSubtasks: params.deleteSubtasks || 'false'}})
    .then(response => {
      return response.data
    })
  }

  public async search(params: {fields: string; jql: string; maxResults?: number}): Promise<any> {
    return this.client.get('rest/api/2/search', {params})
    .then(response => {
      return response.data
    })
  }

  public async getRfcByIssue(issueKey: string, fields = 'fixVersions,issuetype,project,status'): Promise<Issue> {
    const issue = await this.getIssue(issueKey, {fields: fields})
    if (issue.fields.issuetype.name === 'RFC') {
      return issue
    }
    if (issue.fields.fixVersions.length === 0) {
      throw new Error(`Expected to find at least '1' value for fix version, but found '${issue.fields.fixVersions.length}' for issue ${issueKey}`)
    }
    const fixVersion = issue.fields.fixVersions[0]
    const jql = `fixVersion  = ${fixVersion.id} AND issuetype = RFC AND statusCategory != Done`
    const rfcSearchResults = await this.client.get('rest/api/2/search', {params: {fields: fields, jql: jql}}).then(response => {
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

  public async createIssue(issue: any) {
    return this.client.post('rest/api/2/issue', issue)
    .then(response => {
      return response.data as IssueReference
    })
    .catch(error => {
      throw error
    })
  }

  public async transitionIssue(params: {
    issueIdOrKey: string;
    transition?: any;
    fields?: any;
    update?: any;
    historyMetadata?: any;
    properties?: Array<any>;
    [key: string]: any;
  }): Promise<any> {
    return this.client.post(`/rest/api/2/issue/${params.issueIdOrKey}/transitions`, params)
    .then(_response => {
      return this.getIssue(params.issueIdOrKey, {fields: 'status'})
    })
    .catch(error => {
      throw error
    })
  }

  public async createIssueLink(params?: {
    type?: any;
    inwardIssue?: any;
    outwardIssue?: any;
    comment?: any;
  }) {
    return this.client.post('/rest/api/2/issueLink', params)
  }

  async createIssueRemoteWebLink(issue: IssueReference, link: { url: string; title: string }) {
    return this.client.post(`/rest/api/2/issue/${issue.key}/remotelink`, {object: link})
    .then(response => {
      return response.data
    })
  }
}
