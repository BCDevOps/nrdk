import {GitBaseCommand} from '../../git-base'
import {flags} from '@oclif/command'
import {AxiosJiraClient, Issue} from '../../api/service/axios-jira-client'
import {AxiosBitBucketClient} from '../../api/service/axios-bitbucket-client'

type DetailedIssue = Issue & {branch: any; pullRequest: any}

export default class BacklogCheckin extends GitBaseCommand {
  static description = 'Push local changes (commits) to the remote repository'

  static flags = {
    pr: flags.boolean({description: 'Create Pull-Request', default: true}),
  }

  async getJiraIssue(): Promise<DetailedIssue> {
    this.log('Fetching Jira issue associated with current Git branch')
    const jira = this.jira as AxiosJiraClient

    const expectedCurrentBranchName = await this.getCurrentBranchName()

    const issueKey = await AxiosJiraClient.parseJiraIssueKeyFromUri(expectedCurrentBranchName)
    const issue = await jira.getIssue(issueKey, {fields: 'issuetype,components,project'})

    const gitPush = await this._spawn('git', ['push', 'origin'])
    if (gitPush.status !== 0) {
      return this.error('Error pushing changes to remote repository. Try running\n>git push origin')
    }

    const baseBranchName = expectedCurrentBranchName.split('/').slice(1).join('/')
    const devDetails = (await jira.getBranches(issue.id))
    // console.dir(devDetails.branches)
    const branch = devDetails.branches.find((item: { name: string }) => item.name === baseBranchName)
    if (!branch) {
      return this.error(`Missing remote branch ${baseBranchName}`)
    }
    // console.dir(branch)

    // console.dir(devDetails.pullRequests)
    const pullRequest = devDetails.pullRequests.find((item: { source: { branch: string }; status: string }) => item.source.branch === baseBranchName && item.status === 'OPEN')
    // console.dir(pullRequest)

    const detailedIssue: DetailedIssue = Object.assign(issue, {branch: branch, pullRequest: pullRequest})
    return detailedIssue
  }

  async createPullRequest(jiraIssue: DetailedIssue) {
    const jira = this.jira as AxiosJiraClient
    const bitBucket = this.bitBucket as AxiosBitBucketClient

    this.log(`Creating pull request for branch ${jiraIssue.branch.name} ....`)

    let rfcIssue: DetailedIssue
    if (jiraIssue.fields.issuetype.name === 'RFC') {
      rfcIssue = jiraIssue
    } else {
      rfcIssue = await jira.getRfcByIssue(jiraIssue.key) as DetailedIssue
    }

    const rfcDevDetails = (await jira.getBranches(rfcIssue.id))
    if (rfcDevDetails.branches.length === 0) {
      return this.error(`Missing release branch 'release/${rfcIssue.key}'`)
    }
    const releaseBranch = rfcDevDetails.branches[0]
    const repository = AxiosBitBucketClient.parseUrl(releaseBranch.url)
    jiraIssue.pullRequest = await bitBucket.createPullRequest(
      {
        title: jiraIssue.key,
        fromRef: {id: `refs/heads/${jiraIssue.branch.name}`, repository},
        toRef: {id: `refs/heads/${releaseBranch.name}`, repository},
      }
    )
    return jiraIssue
  }

  async run() {
    let jiraIssue = await this.getJiraIssue()

    if (jiraIssue.pullRequest) {
      this.log(`Pull Request ${jiraIssue.pullRequest.id} has been updated`)
    } else {
      jiraIssue = await this.createPullRequest(jiraIssue)
      // console.dir(jiraIssue.pullRequest, {depth: 5})
      this.log(`Pull Request #${jiraIssue.pullRequest.id} has been created`)
    }
  }
}
