/**
 * https://docs.atlassian.com/bitbucket-server/rest/7.6.0/bitbucket-branch-rest.html
 * https://bwa.nrs.gov.bc.ca/int/jira/rest/api/2/issue/ONETEAM-275
 * https://bwa.nrs.gov.bc.ca/int/jira/rest/dev-status/latest/issue/summary?issueId=131578
 * https://bwa.nrs.gov.bc.ca/int/jira/rest/dev-status/1.0/issue/detail?issueId=131578&applicationType=stash&dataType=pullrequest
 */
import {flags} from '@oclif/command'
import {AxiosJiraClient} from '../../api/service/axios-jira-client'
import {GitBaseCommand} from '../../git-base'
import * as inquirer from 'inquirer'
import * as path from 'path'
import {BranchReference, RepositoryReference} from '../../api/service/axios-bitbucket-client'
import cli from 'cli-ux'

export default class GitCheckout extends GitBaseCommand {
  static description = 'Create (if required), and checkout the git branch supporting a Jira issue (bug, new feature, improvement, etc...)'

  static flags = {
    project: flags.string({hidden: true, char: 'p', description: 'BitBucket Project/Group Name'}),
    repository: flags.string({hidden: true, char: 'r', description: 'BitBucket Repository Name'}),
    branch: flags.string({hidden: true, char: 'b', description: 'Remote Branch Name'}),
    username: flags.string({hidden: true, char: 'u', description: 'Username to be appended to branch names'}),
  }

  static args = [{name: 'issue', description: 'Jira issue key (e.g.: WEBADE-123)'}]

  async action(message: string, promise: Promise<any>) {
    return Promise.resolve(true)
    .then(() => {
      cli.action.start(message)
      return promise
    }).finally(() => {
      cli.action.stop()
    })
  }

  async run() {
    const {args, flags} = this.parse(GitCheckout)
    const jira = this.jira as AxiosJiraClient
    const issue = await this.action(`Fetching Jira Issue ${args.issue}`, jira.getIssue(args.issue, {fields: 'issuetype,components'}))
    if (!flags.repository || !flags.project) {
      if (issue.fields.components.length !== 1) {
        return this.error(`Expected at least 1 component set for issue '${issue.key}', but found '${issue.fields.components.length}'`)
      }
      const component = issue.fields.components[0]
      const repositoryReference = await jira.getComponentRepositoryInfo(component)
      flags.repository = repositoryReference.slug
      flags.project = repositoryReference.project.key
    }
    const repository: RepositoryReference = {slug: flags.repository, project: {key: flags.project as string}}
    let branchInfo: BranchReference
    // RFC issues
    if (issue.fields.issuetype.name === 'RFC') {
      branchInfo = await this.createReleaseBranch(issue, repository)
    } else {
    // non-RFC issues
      this.log(`Finding RFC for issue ${issue.key}/${issue.id}`)
      const rfc = await jira.getRfcByIssue(issue.key)
      this.log(`Found RFC ${rfc.key}/${rfc.id}`)
      const releaseBranch = await this.createReleaseBranch(rfc, repository)
      let branchName = `feature/${issue.key}`
      if (flags.username) {
        branchName += `-${flags.username}`
      }
      branchInfo = await this.createBranch(issue, repository, branchName, releaseBranch.name)
    }
    const expectedGitRemoteOriginUrl = `https://bwa.nrs.gov.bc.ca/int/stash/scm/${branchInfo.repository.project.key}/${branchInfo.repository.slug}.git`
    const gitTopLevel = await this._spawn('git', ['rev-parse', '--show-toplevel'])
    let expectedRepoCwd = process.cwd()
    if (gitTopLevel.status !== 0) {
      this.log(`Current directory (${process.cwd()}) is not the root of a git repository.`)
      const prompt = inquirer.createPromptModule()
      let answer = await prompt([{type: 'confirm', name: 'clone', message: `Would you like to clone ${expectedGitRemoteOriginUrl}?`}])
      if (answer.clone !== true) {
        return this.exit(1)
      }
      expectedRepoCwd = path.resolve(process.cwd(), `${branchInfo.repository.project.key}-${branchInfo.repository.slug}`)
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
