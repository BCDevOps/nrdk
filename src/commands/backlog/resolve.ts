import {GitBaseCommand} from '../../git-base'
import {flags} from '@oclif/command'
import {AxiosJiraClient} from '../../api/service/axios-jira-client'
import {AxiosBitBucketClient} from '../../api/service/axios-bitbucket-client'

export default class BacklogResolve extends GitBaseCommand {
  static description = 'Resolve issue: Merge Pull Request, Delete Source Branch'

  static args = [{name: 'issue', description: 'Jira issue key (e.g.: WEBADE-123)'}]

  static flags = {
    branch: flags.string({hidden: true, name: 'branch', description: 'Branch name'}),
    issueId: flags.string({hidden: true, description: 'Internal issue ID'}),
    issueType: flags.string({hidden: true, description: 'Issue Type'}),
  }

  static hidden = true

  async run() {
    const {args, flags} = this.parse(BacklogResolve)
    const issueKey = args.issue
    if (!flags.issueId ||  !flags.issueType) {
      const issue = await this.jira().getIssue(issueKey, {fields: 'issuetype'})
      flags.issueId = issue.id
      flags.issueType = issue.fields.issuetype.name
    }
    if (!flags.branch) {
      flags.branch = `feature/${issueKey}`
      if (flags.issueType === 'RFC') {
        flags.branch = `release/${issueKey}`
      }
    }
    const issueId = flags.issueId as string
    const devDetails = (await this.jira().getBranches(issueId))
    const branches = devDetails.branches.filter((item: { name: string }) => item.name === flags.branch)
    if (branches.length !== 1) {
      return this.error(`Missing remote branch ${flags.branch}`)
    }
    // console.dir(branches)
    const fromBranch = branches[0]
    // console.dir(devDetails.pullRequests)
    const openPullRequests = devDetails.pullRequests.filter((item: { source: { branch: string }; status: string }) => item.source.branch === flags.branch && item.status === 'OPEN')
    // console.dir(openPullRequests)
    // status: DECLINED
    if (openPullRequests.length === 0) {
      this.log(`No pull-request open for branch ${fromBranch.name}`)
    } else if (openPullRequests.length > 1) {
      this.log(`More than 1 pull-request open for branch ${fromBranch.name}`)
    } else {
      const pullRequest = openPullRequests[0]
      const pullRequestNumber = parseInt((pullRequest.id as string).substr(1), 10) // remove '#' from the beginning of the id
      this.log(`Merging Pull-Request ${pullRequest.id} ...`)
      const repoInfo = AxiosBitBucketClient.parseUrl(pullRequest.url)
      await this.bitBucket().mergePullRequest(repoInfo.project.key, repoInfo.slug, pullRequestNumber)
    }
    const sourceBranchRepoInfo = AxiosBitBucketClient.parseUrl(fromBranch.url)
    this.log(`Deleting source branch ${fromBranch.name} ...`)
    await this.bitBucket().deleteBranch(sourceBranchRepoInfo.project.key, sourceBranchRepoInfo.slug, fromBranch.name)
  }
}
