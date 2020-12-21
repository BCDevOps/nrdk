/**
 * https://docs.atlassian.com/bitbucket-server/rest/7.6.0/bitbucket-branch-rest.html
 * https://bwa.nrs.gov.bc.ca/int/jira/rest/api/2/issue/ONETEAM-275
 * https://bwa.nrs.gov.bc.ca/int/jira/rest/dev-status/latest/issue/summary?issueId=131578
 * https://bwa.nrs.gov.bc.ca/int/jira/rest/dev-status/1.0/issue/detail?issueId=131578&applicationType=stash&dataType=pullrequest
 */
import {flags} from '@oclif/command'
import {Issue} from '../../api/service/axios-jira-client'
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

  async getIssue(issueKey: string): Promise<Issue> {
    if (!this.jira) return this.error('Jira client has not been initialized')
    return this.action(`Fetching Jira Issue ${issueKey}`, this.jira.getIssue(issueKey, {fields: 'issuetype,components'}))
  }

  async gitCloneRepository(branchInfo: BranchReference) {
    const expectedGitRemoteOriginUrl = `https://bwa.nrs.gov.bc.ca/int/stash/scm/${branchInfo.repository.project.key}/${branchInfo.repository.slug}.git`
    const gitTopLevel = await this._spawn('git', ['rev-parse', '--show-toplevel'])
    let expectedRepoCwd = await this.cwd()
    if (gitTopLevel.status !== 0) {
      this.log(`Current directory (${expectedRepoCwd}) is not the root of a git repository.`)
      const prompt = inquirer.createPromptModule()
      let answer = await prompt([{type: 'confirm', name: 'clone', message: `Would you like to clone ${expectedGitRemoteOriginUrl}?`}])
      if (answer.clone !== true) {
        return this.exit(1)
      }
      expectedRepoCwd = path.resolve(expectedRepoCwd, `${branchInfo.repository.project.key}-${branchInfo.repository.slug}`)
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
    branchInfo.repository.cwd = expectedRepoCwd
    return branchInfo
  }

  async gitCheckoutBranch(branchInfo: BranchReference) {
    if (!branchInfo.repository.cwd) return this.error('Repository work directory has not been initialized')

    const currentBranchName = await this.getCurrentBranchName({cwd: branchInfo.repository.cwd})

    if (currentBranchName !== `origin/${branchInfo.name}`) {
      this.log(`Currently on branch '${currentBranchName}'. Checking out branch '${branchInfo.name}'`)
      const gitCheckout = await this._spawn('git', ['checkout', branchInfo.name], {cwd: branchInfo.repository.cwd})
      if (gitCheckout.status !== 0) {
        return this.error(`Error checkout branch ${branchInfo.name}. Try running\n>git checkout ${branchInfo.name}`)
      }
    }
    this.log('Updating local branch with remote branch')
    const gitRebase = await this._spawn('git', ['rebase', `origin/${branchInfo.name}`], {cwd: branchInfo.repository.cwd})
    if (gitRebase.status !== 0) {
      return this.error(`Error rebasing/updating branch ${branchInfo.name}. Try running\n>git rebase origin/${branchInfo.name}`)
    }
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * if the issue branch doesn't exist, one will be created.
   */
  async getIssueBranch(issue: Issue, repository: RepositoryReference, username?: string) {
    if (!this.jira) return this.error('Jira client has not been initialized')
    // RFC issues
    if (issue.fields.issuetype.name === 'RFC') {
      return this.createReleaseBranch(issue, repository)
    }
    // non-RFC issues
    this.log(`Finding RFC for issue ${issue.key}/${issue.id}`)
    const rfc = await this.jira.getRfcByIssue(issue.key)
    this.log(`Found RFC ${rfc.key}/${rfc.id}`)
    const releaseBranch = await this.createReleaseBranch(rfc, repository)
    let branchName = `feature/${issue.key}`
    if (username) {
      branchName += `-${username}`
    }
    return this.createBranch(issue, repository, branchName, releaseBranch.name)
  }

  async getRepository(issue: Issue, flags: any):  Promise<RepositoryReference> {
    if (!this.jira) return this.error('Jira client has not been initialized')
    if (!flags.repository || !flags.project) {
      if (issue.fields.components.length !== 1) {
        return this.error(`Expected at least 1 component set for issue '${issue.key}', but found '${issue.fields.components.length}'`)
      }
      const component = issue.fields.components[0]
      const repositoryReference = await this.jira.getComponentRepositoryInfo(component)
      flags.repository = repositoryReference.slug
      flags.project = repositoryReference.project.key
    }
    return {slug: flags.repository, project: {key: flags.project as string}}
  }

  async run() {
    const {args, flags} = this.parse(GitCheckout)

    const issue = await this.getIssue(args.issue)
    const repository: RepositoryReference = await this.getRepository(issue, flags)
    const branchInfo: BranchReference = await this.getIssueBranch(issue, repository)

    // clone
    await this.gitCloneRepository(branchInfo)
    // Checkout branch
    await this.gitCheckoutBranch(branchInfo)
    return branchInfo
  }
}
