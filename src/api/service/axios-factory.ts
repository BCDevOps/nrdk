import {Secret, SecretManager, SVC_IDIR_SPEC} from './secret-manager'
import {AxiosJiraClient} from './axios-jira-client'
import {AxiosBitBucketClient} from './axios-bitbucket-client'
import {AxiosGitHubClient} from './axios-github-client'
import GitClient from '../../git-client'
import {GitProvider} from '../model/git'

export class AxiosFactory {
  static async getSecretManager() {
    return SecretManager.getInstance()
  }

  static async createIdirAuthorizationHeader() {
    const entry = await (await AxiosFactory.getSecretManager()).getEntry(SVC_IDIR_SPEC)
    const idirUsername = (await entry.getProperty(SVC_IDIR_SPEC.fields.UPN.name)).getPlainText()
    const idirPassword = (await entry.getProperty(SVC_IDIR_SPEC.fields.PASSWORD.name))
    return AxiosFactory.createBasicAuthorizationHeader(idirUsername, idirPassword)
  }

  static async createBasicAuthorizationHeader(username: string, password: Secret) {
    return `Basic ${Buffer.from(username + ':' + password.getPlainText(), 'utf8').toString('base64')}`
  }

  static async jira(): Promise<AxiosJiraClient> {
    const idirAuthorizationHeader = await AxiosFactory.createIdirAuthorizationHeader()
    return new AxiosJiraClient(idirAuthorizationHeader)
  }

  static async bitBucket(): Promise<AxiosBitBucketClient> {
    const idirAuthorizationHeader = await AxiosFactory.createIdirAuthorizationHeader()
    return new AxiosBitBucketClient(idirAuthorizationHeader)
  }

  static async gitHub(url: string): Promise<AxiosGitHubClient> {
    const credential = await GitClient.getCachedCredential(url)
    if (credential) {
      const authorizationHeader = await AxiosFactory.createBasicAuthorizationHeader(credential.username, credential.password)
      return new AxiosGitHubClient(authorizationHeader)
    }
    return null as unknown as AxiosGitHubClient
  }

  static async gitProvider(url: string): Promise<GitProvider> {
    if (url.startsWith('https://github.com/')) {
      return this.gitHub(url)
    }
    return this.bitBucket()
  }
}
