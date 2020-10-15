import {GitBaseCommand} from '../../git-base'
import {flags} from '@oclif/command'
import {AxiosJiraClient} from '../../api/service/axios-jira-client'
import {AxiosBitBucketClient} from '../../api/service/axios-bitbucket-client'

export default class BacklogCheckin extends GitBaseCommand {
  static description = 'Push local changes (commits) to the remote repository'

  static flags = {
    pr: flags.boolean({description: 'Create Pull-Request', default: true}),
  }

  async run() {
    const jira = this.jira as AxiosJiraClient
    const bitBucket = this.bitBucket as AxiosBitBucketClient
    const gitCurrentTrackingBranchName = await this._spawn('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])
    const expectedCurrentTrackingBranchName = gitCurrentTrackingBranchName.stdout.trim()
    const baseBranchName = expectedCurrentTrackingBranchName.split('/').slice(1).join('/')
    this.log('expectedCurrentTrackingBranchName', expectedCurrentTrackingBranchName)
    const issueKey = AxiosJiraClient.JIRA_ISSUE_KEY_REGEX.exec(expectedCurrentTrackingBranchName)?.groups?.issueKey as string
    const issue = await jira.getIssue(issueKey, {fields: 'issuetype,components,project'})

    const gitPush = await this._spawn('git', ['push', 'origin'])
    if (gitPush.status !== 0) {
      return this.error('Error pushing changes to remote repository. Try running\n>git push origin')
    }
    const devDetails = (await jira.getBranches(issue.id))
    // console.dir(devDetails.branches)
    const branches = devDetails.branches.filter((item: { name: string }) => item.name === baseBranchName)
    if (branches.length !== 1) {
      return this.error(`Missing remote branch ${baseBranchName}`)
    }
    // console.dir(branches)
    const fromBranch = branches[0]
    // console.dir(devDetails.pullRequests)
    const openPullRequests = devDetails.pullRequests.filter((item: { source: { branch: string }; status: string }) => item.source.branch === baseBranchName && item.status === 'OPEN')
    // console.dir(openPullRequests)
    // status: DECLINED
    if (openPullRequests.length === 0) {
      this.log(`Creating pull request for branch ${fromBranch.name} ....`)
      let rfcIssue = issue
      if (issue.fields.issuetype.name !== 'RFC') {
        rfcIssue = await jira.getRfcByIssue(issue.key)
      }
      const rfcDevDetails = (await jira.getBranches(rfcIssue.id))
      if (rfcDevDetails.branches.length === 0) {
        return this.error(`Missing release branch 'release/${rfcIssue.key}'`)
      }
      const releaseBranch = rfcDevDetails.branches[0]
      const repository = AxiosBitBucketClient.parseUrl(releaseBranch.url)
      const newPullRequest = await bitBucket.createPullRequest(
        {
          title: issue.key,
          fromRef: {id: `refs/heads/${fromBranch.name}`, repository},
          toRef: {id: `refs/heads/${releaseBranch.name}`, repository},
        }
      )
      // console.dir(newPullRequest, {depth: 5})
      this.log(`Pull Request #${newPullRequest.id} has been created`)
    } else  {
      this.log(`Pull Request ${openPullRequests[0].id} has been updated`)
    }
  }
}
