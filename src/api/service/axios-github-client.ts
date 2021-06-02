/* eslint-disable valid-jsdoc */
import {AxiosClient} from './axios-client'
import {LoggerFactory} from '../../util/logger'
import {BranchReference, RepositoryReference} from './axios-bitbucket-client'
import {GitProvider} from '../model/git'

export interface GitHubRef {
  ref: string;
  object: {
    sha: string;
  };
}

export class AxiosGitHubClient extends AxiosClient implements GitProvider {
  logger = LoggerFactory.createLogger(__filename.slice(__dirname.length + 1))

  constructor(authorizationHeader: string) {
    super('https://api.github.com', authorizationHeader)
  }

  async createBranchIfMissing(repository: RepositoryReference, branchName: string, startPoint: string): Promise<BranchReference> {
    return this.client.get(`/repos/${repository.project.key}/${repository.slug}/git/ref/heads/${startPoint}`, {headers: {Accept: 'application/vnd.github.v3+json'}})
    .then(response => {
      return response.data as GitHubRef
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.dir(error)
      throw error
    })
    .then(ref => {
      return this.client.post(`/repos/${repository.project.key}/${repository.slug}/git/refs`, {ref: `refs/heads/${branchName}`, sha: ref.object.sha})
      .then(response => {
        // eslint-disable-next-line newline-per-chained-call
        const shortBranchName = response.data.ref.split('/').slice(2).join('/')
        const branchRef: BranchReference = {name: shortBranchName, repository}
        return branchRef
      })
      .catch(error => {
        if (error.response.data.message === 'Reference already exists') {
          return {name: branchName, repository}
        }
        // eslint-disable-next-line no-console
        console.dir(error)
        throw error
      })
    })
  }
}
