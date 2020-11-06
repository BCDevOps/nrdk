
import {AxiosFactory} from '../api/service/axios-factory'
import {AxiosJiraClient} from '../api/service/axios-jira-client'
import * as RFD from './jira-rfd-workflow-v1.2.2'

interface IssueReferenceByUrl {
  url: string;
}

interface IssueReferenceByKey {
  key: string;
}

interface IssueReference {
  url: string;
  key?: string;
}

interface DeploymentArgument {
  issue: IssueReference;
  pullRequest: {
    url: string;
    number?: string;
    sourceBranch: string;
    targetBranch: string;
    repository: {
      name?: string;
      url: string;
      project?: {key: string};
    };
  };
  targetEnvironment: string;
}

interface IssueResolution {
  id?: string;
  name?: string;
}

interface IssueStatus {
  id?: string;
  name?: string;
}

interface IssueType {
  id?: string;
  name?: string;
}

interface Issue {
  id: string;
  key: string;
  fields: {
    summary?: string;
    status?: IssueStatus;
    issuetype?: IssueType;
    [key: string]: any;
  };
}
export class RfdHelper {
  settings: any;

  constructor(settings: any) {
    this.settings = settings
  }

  async createJiraClient() {
    return AxiosFactory.jira()
  }

  async closeRFD(issue: Issue, resolution: IssueResolution) {
    if (issue.fields.status?.id === RFD.STATUS_RESOLVED.id) {
      const jira = await this.createJiraClient()
      jira.transitionIssue({issueIdOrKey: issue?.key, transition: {id: RFD.ACTION_701.id}, fields: {resolution: resolution}})
    }
  }

  async deploymentStarted(param: DeploymentArgument) {
    const jira = await this.createJiraClient()
    if (!param.issue.key) param.issue.key = await AxiosJiraClient.parseJiraIssueKeyFromUri(param.issue.url)
    const rfc = await jira.getRfcByIssue(param.issue.key)
    // eslint-disable-next-line no-console
    console.log(rfc.key)
    // return rfc
    // Retrieve RFC
    // Find RFD linked to pull-request and environment
    await jira.search({
      fields: 'fixVersions,issuetype,project,status',
      jql: `issueFunction in linkedIssuesOfRemote("${param.pullRequest.url}") and "Target environment" = "${param.targetEnvironment}" and status  != "Closed"`,
    })
    .then(async result => {
      for (const issue of result.issues) {
        // eslint-disable-next-line no-await-in-loop
        await this.closeRFD(issue, {name: 'Duplicate'})
      }
    })

    // if an open RFD is found, close it
    // create RFD
    jira.createIssue({project: {key: rfc.fields.project.key}})
  }

  async deploymentFailed(_rfcIssueKey: string) {
    // no-op
  }

  async deploymentSuccessful(_rfcIssueKey: string) {
    // no-op
  }
}
