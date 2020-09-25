/**
 * https://docs.atlassian.com/bitbucket-server/rest/7.6.0/bitbucket-branch-rest.html
 * https://bwa.nrs.gov.bc.ca/int/jira/rest/api/2/issue/ONETEAM-275
 * https://bwa.nrs.gov.bc.ca/int/jira/rest/dev-status/latest/issue/summary?issueId=131578
 * https://bwa.nrs.gov.bc.ca/int/jira/rest/dev-status/1.0/issue/detail?issueId=131578&applicationType=stash&dataType=pullrequest
 */
import {flags} from '@oclif/command'
import {SecretManager, SVC_IDIR_SPEC} from '../../api/service/secret-manager'
import {AxiosJiraClient} from '../../api/service/axios-jira-client'
import {GitBaseCommand} from '../../git-base'
import * as inquirer from 'inquirer'
import * as path from 'path'

export default class GitCheckout extends GitBaseCommand {
  static description = 'Create (if required), and checkout the git branch supporting a Jira issue (bug, new feature, improvement, etc...)'

  static flags = {
    project: flags.string({char: 'p', description: 'BitBucket Project/Group Name'}),
    repository: flags.string({char: 'r', description: 'BitBucket Repository Name'}),
    branch: flags.string({char: 'b', description: 'Remote Branch Name'}),
    personal: flags.boolean({hidden: true, description: 'Append username to branch name'}),
  }

  static args = [{name: 'issue', description: 'Jira issue key (e.g.: WEBADE-123)'}]

  async run() {
    const idirSecret = await (await SecretManager.getInstance()).getEntry(SVC_IDIR_SPEC)
    const {args, flags} = this.parse(GitCheckout)
    const jira = this.jira as AxiosJiraClient
    const issue = await jira.getIssue(args.issue, {fields: 'issuetype,components'})
    if (issue.fields.components.length !== 1) {
      return this.error(`Expected at least 1 component set for issue '${issue.key}', but found '${issue.fields.components.length}'`)
    }
    const component = issue.fields.components[0]
    const repository = await jira.getComponentRepositoryInfo(component)
    let branchInfo: any = null
    // RFC issues
    if (issue.fields.issuetype.name === 'RFC') {
      branchInfo = this.createReleaseBranch(issue, repository)
    } else {
    // non-RFC issues
      this.log(`Finding RFC for issue ${issue.key}`)
      const rfc = await jira.getRfcByIssue(issue.key)
      this.log(`Found RFC ${rfc.key}`)
      const releaseBranch = await this.createReleaseBranch(rfc, repository)
      let branchName = `feature/${issue.key}`
      if (flags.personal) {
        const username = (await idirSecret.getProperty(SVC_IDIR_SPEC.fields.USERNAME.name)).getPlainText()
        branchName += `-${username}`
      }
      branchInfo = await this.createBranch(issue, repository, branchName, releaseBranch.name)
    }
    const expectedGitRemoteOriginUrl = `https://bwa.nrs.gov.bc.ca/int/stash/scm/${branchInfo.repository.project}/${branchInfo.repository.name}.git`
    const gitTopLevel = await this._spawn('git', ['rev-parse', '--show-toplevel'])
    let expectedRepoCwd = process.cwd()
    if (gitTopLevel.status !== 0) {
      this.log(`Current directory (${process.cwd()}) is not the root of a git repository.`)
      const prompt = inquirer.createPromptModule()
      let answer = await prompt([{type: 'confirm', name: 'clone', message: `Would you like to clone ${expectedGitRemoteOriginUrl}?`}])
      if (answer.clone !== true) {
        return this.exit(1)
      }
      expectedRepoCwd = path.resolve(process.cwd(), `${branchInfo.repository.project}-${branchInfo.repository.name}`)
      answer = await prompt([{type: 'input', name: 'path', message: 'Where would you like to clone?', default: expectedRepoCwd}])
      expectedRepoCwd = answer.path
      const gitClone = await this._spawn('git', ['clone', expectedGitRemoteOriginUrl, expectedRepoCwd])
      if (gitClone.status !== 0) {
        return this.error(`Error cloning repository. Try running\n>git clone ${expectedGitRemoteOriginUrl} ${expectedRepoCwd}`)
      }
    }
    const gitRemoteOriginUrl = await this._spawn('git', ['config', '--get', 'remote.origin.url'], {cwd: expectedRepoCwd})
    if (expectedGitRemoteOriginUrl.trim().toLowerCase() !== gitRemoteOriginUrl.stdout.trim().toLowerCase()) {
      return this.error(`Expected the git remote url to be '${expectedGitRemoteOriginUrl}', but found '${gitRemoteOriginUrl.stdout.trim()}'`)
    }
    const gitFetch = await this._spawn('git', ['fetch', 'origin'], {cwd: expectedRepoCwd})
    if (gitFetch.status !== 0) {
      return this.error('Error fetching changes from remote repository. Try running\n>git fetch origin')
    }
    const gitCurrentTrackingBranchName = await this._spawn('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], {cwd: expectedRepoCwd})
    const expectedCurrentTrackingBranchName = gitCurrentTrackingBranchName.stdout.trim()
    if (expectedCurrentTrackingBranchName !== `origin/${branchInfo.name}`) {
      this.log(`Currently on branch '${expectedCurrentTrackingBranchName}'. Checking out branch '${branchInfo.name}'`)
      const gitCheckout = await this._spawn('git', ['checkout', branchInfo.name], {cwd: expectedRepoCwd})
      if (gitCheckout.status !== 0) {
        return this.error(`Error checkout branch ${branchInfo.name}. Try running\n>git checkout ${branchInfo.name}`)
      }
    }
    this.log('Updating local branch with remote branch')
    const gitRebase = await this._spawn('git', ['rebase', `origin/${branchInfo.name}`], {cwd: expectedRepoCwd})
    if (gitRebase.status !== 0) {
      return this.error(`Error rebasing/updating branch ${branchInfo.name}. Try running\n>git rebase origin/${branchInfo.name}`)
    }
    return branchInfo
  }
}
