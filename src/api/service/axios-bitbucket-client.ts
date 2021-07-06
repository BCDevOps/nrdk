import {GitProvider} from '../model/git'
import {AxiosClient} from './axios-client'

export const FIELDS = Object.freeze({
  ISSUE_TYPE: 'issuetype',
})
export interface RepositoryReference {
  cwd?: string;
  url?: string;
  slug: string;
  project: {key: string};
}
export interface BranchReference {
  name: string;
  repository: RepositoryReference;
}

export interface CreatePullRequestOptions {
  title: string;
  fromRef: {id: string; repository: RepositoryReference};
  toRef: {id: string; repository: RepositoryReference};
}

export class AxiosBitBucketClient extends AxiosClient implements GitProvider {
  static createPullRequestUrl(repo: RepositoryReference, pullRequestNumber: string): string {
    return `https://apps.nrs.gov.bc.ca/int/stash/projects/${repo.project.key}/repos/${repo.slug}/pull-requests/${pullRequestNumber}/overview`
  }

  static parseUrl(url: string): RepositoryReference {
    const GITHUB_REGEX = /(?<url>https:\/\/github.com\/(?<owner>[^/]+)\/(?<repository>[^.]+)(\.git)?)/i
    const gitHubMatch =  url.match(GITHUB_REGEX)
    if (gitHubMatch) {
      return {url: `https://github.com/${gitHubMatch.groups?.owner}/${gitHubMatch.groups?.repository}.git`, slug: gitHubMatch.groups?.repository as string, project: {key: gitHubMatch.groups?.owner as string}}
    }
    const BITBUCKET = [
      /https:\/\/(apps|bwa)\.nrs\.gov\.bc\.ca\/int\/stash\/projects\/(?<project>[^/]+)\/repos\/(?<repository>[\w-]+)(\.git)?/i,
      /https:\/\/(apps|bwa)\.nrs\.gov\.bc\.ca\/int\/stash\/scm\/(?<project>[^/]+)\/(?<repository>[\w-]+)(\.git)?/i,
    ]
    for (const regex of BITBUCKET) {
      const m = url.match(regex)
      if (m) {
        return {url: `https://bwa.nrs.gov.bc.ca/int/stash/scm/${m.groups?.project}/${m.groups?.repository}.git`, slug: m.groups?.repository as string, project: {key: m.groups?.project as string}}
      }
    }
    throw new Error(`Unable to parse BitBucket Url from ${url}`)
  }

  constructor(idirAuthorizationHeader: string) {
    super(process.env.BITBUCKET_URL || 'https://bwa.nrs.gov.bc.ca/int/stash', idirAuthorizationHeader)
  }

  async createBranchIfMissing(_repository: RepositoryReference, _branchName: string, _startPoint: string): Promise<BranchReference> {
    throw new Error('Method not implemented.')
  }

  public createBranch(projectKey: string, repositorySlug: string, name: string, startPoint: string) {
    return this.client.post(`rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/branches`, {name, startPoint, message: 'Create release branch'})
    .then(response => {
      return response.data
    })
  }

  public deleteBranch(projectKey: string, repositorySlug: string, name: string) {
    // console.log(arguments)
    return this.client.request({
      method: 'DELETE',
      url: `rest/branch-utils/1.0/projects/${projectKey}/repos/${repositorySlug}/branches`,
      data: {name},
    })
    .then(response => {
      return response.data
    })
  }

  public createPullRequest(options: CreatePullRequestOptions) {
    // console.dir(options, {depth: 4})
    return this.client.post(`rest/api/1.0/projects/${options.toRef.repository.project.key}/repos/${options.toRef.repository.slug}/pull-requests`, options)
    .then(response => {
      return response.data
    })
  }

  public async mergePullRequest(project: string, repository: string, pullRequestNumber: number) {
    return this.client.get(`rest/api/1.0/projects/${project}/repos/${repository}/pull-requests/${pullRequestNumber}`, {})
    .then(response => {
      return response.data
    })
    .then(pullRequest => {
      return this.client.post(`rest/api/1.0/projects/${project}/repos/${repository}/pull-requests/${pullRequestNumber}/merge?version=${pullRequest.version}`, {})
      .then(response => {
        // console.dir(response, {depth: 5})
        return response.data
      })
    })
  }
}
