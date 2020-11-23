import {AxiosBitBucketClient} from '../../api/service/axios-bitbucket-client'
import {AxiosJiraClient} from '../../api/service/axios-jira-client'
import {RfdHelper} from '../../util/rfd-helper'

export class LiquibaseBuilder {
  settings: any

  // eslint-disable-next-line no-useless-constructor
  constructor(settings: any) {
    this.settings = settings
  }

  async build() {
    const helper = new RfdHelper({})
    const sourceBranch = this.settings.options.git.branch.merge
    const targetBranch = (this.settings?.options?.git?.change?.target || '').trim()
    const repo = AxiosBitBucketClient.parseUrl(this.settings.options.git.url)
    const issueKey =  await AxiosJiraClient.parseJiraIssueKeyFromUri(sourceBranch)
    return helper.createDeployments({
      issue: {key: issueKey},
      pullRequest: {
        url: AxiosBitBucketClient.createPullRequestUrl(repo, this.settings.options.pr),
        number: this.settings.options.pr,
        sourceBranch: sourceBranch,
        targetBranch: targetBranch,
        repository: repo,
      },
      targetEnvironment: this.settings.environments,
    })
  }
}

export default async function (settings: any) {
  await new LiquibaseBuilder(settings).build()
}
