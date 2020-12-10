import {AxiosInstance} from 'axios'

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

export class AxiosBitBucketClient {
  readonly client: AxiosInstance

  static createPullRequestUrl(repo: RepositoryReference, pullRequestNumber: string): string {
    return `https://apps.nrs.gov.bc.ca/int/stash/projects/${repo.project.key}/repos/${repo.slug}/pull-requests/${pullRequestNumber}/overview`
  }

  static parseUrl(url: string): RepositoryReference {
    if (url.match(/https:\/\/(apps|bwa)\.nrs\.gov\.bc\.ca\/int\/stash\/scm\//m)) {
      // eslint-disable-next-line no-useless-escape
      const m = url.match(/https:\/\/(apps|bwa)\.nrs\.gov\.bc\.ca\/int\/stash\/scm\/(?<project>[^/]+)\/(?<repository>[^\s\.]+)(\.git)?/m)
      if (!m) throw new Error(`Unable to parse BitBucket Url from ${url}`)
      return {url: m[0], slug: m.groups?.repository as string, project: {key: m.groups?.project as string}}
    }
    const m = url.match(/https:\/\/(apps|bwa)\.nrs\.gov\.bc\.ca\/int\/stash\/projects\/(?<project>[^/]+)\/repos\/(?<repository>[^/\s]+)/m)
    if (!m) throw new Error(`Unable to parse BitBucket Url from ${url}`)
    return {url: m[0] as string, slug: m.groups?.repository as string, project: {key: m.groups?.project as string}}
  }

  constructor(client: AxiosInstance) {
    this.client = client
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
