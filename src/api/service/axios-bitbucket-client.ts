import {AxiosInstance} from 'axios'

export const FIELDS = Object.freeze({
  ISSUE_TYPE: 'issuetype',
})
export interface RepositoryReference {
  slug: string;
  project: {key: string};
}
export interface CreatePullRequestOptions {
  title: string;
  fromRef: {id: string; repository: RepositoryReference};
  toRef: {id: string; repository: RepositoryReference};
}

export class AxiosBitBucketClient {
  readonly client: AxiosInstance

  static parseUrl(url: string) {
    const regex = /https:\/\/(apps|bwa)\.nrs\.gov\.bc\.ca\/int\/stash\/projects\/(?<project>[^/]+)\/repos\/(?<repository>[^/\s]+)/gm
    const m = regex.exec(url)
    if (m === null) {
      throw new Error(`Unable to parse BitBucket Url from ${url}`)
    }
    return {slug: m.groups?.repository as string, project: {key: m.groups?.project as string}}
  }

  constructor(client: AxiosInstance) {
    this.client = client
  }

  public createBranch(projectKey: string, repositorySlug: string, name: string, startPoint: string) {
    return this.client.post(`rest/api/1.0/projects/${projectKey}/repos/${repositorySlug}/branches`, {name, startPoint, message: 'Create release branch'}).then(response => {
      return response.data
    })
  }

  public createPullRequest(options: CreatePullRequestOptions) {
    // console.dir(options, {depth: 4})
    return this.client.post(`rest/api/1.0/projects/${options.toRef.repository.project.key}/repos/${options.toRef.repository.slug}/pull-requests`, options).then(response => {
      return response.data
    })
  }
}
