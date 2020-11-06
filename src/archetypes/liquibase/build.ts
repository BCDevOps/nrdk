import {AxiosBitBucketClient} from '../../api/service/axios-bitbucket-client'
import {AxiosJiraClient} from '../../api/service/axios-jira-client'
const Jira = require.main?.exports.Jira as any

export class LiquibaseBuilder {
  settings: any

  // eslint-disable-next-line no-useless-constructor
  constructor(settings: any) {
    this.settings = settings
  }

  async build() {
    const repoRef = AxiosBitBucketClient.parseUrl(this.settings.options.git.url)
    const username = this.settings.phases.build.credentials.idir.user
    const password = this.settings.phases.build.credentials.idir.pass
    const changeBranch = this.settings.options.git.branch.merge
    const branchName = 'PR-' + this.settings.options.pr
    await this._createJiraAutoRFDs(this.settings.jiraUrl, repoRef.slug, changeBranch, branchName, username, password)
  }

  // eslint-disable-next-line max-params
  async _createJiraAutoRFDs(jiraUrl: string, repoName: string, changeBranch: string, branchName: string, username: string, password: string) {
    const rfcIssueKey = await AxiosJiraClient.parseJiraIssueKeyFromUri(changeBranch)
    const issueElements = rfcIssueKey.split('-')
    const projectName = issueElements[0].toUpperCase()

    const jiraSettings = {
      url: jiraUrl,
      username: username,
      password: password,
      rfcIssueKey: rfcIssueKey,
      changeBranch: changeBranch,
      branchName: branchName,
      repoName: repoName,
      projectName: projectName,
    }

    const jira = new Jira(Object.assign({phase: 'jira-update', jira: jiraSettings}))
    return jira.createRFD()
  }
}

export default async function (settings: any) {
  await new LiquibaseBuilder(settings).build()
}
