import {SecretManager, SVC_IDIR_SPEC} from './secret-manager'
import {AxiosJiraClient} from './axios-jira-client'
import {AxiosBitBucketClient} from './axios-bitbucket-client'

export class AxiosFactory {
  static async getSecretManager() {
    return SecretManager.getInstance()
  }

  static async createIdirAuthorizationHeader() {
    const entry = await (await AxiosFactory.getSecretManager()).getEntry(SVC_IDIR_SPEC)
    const idirUsername = (await entry.getProperty(SVC_IDIR_SPEC.fields.UPN.name)).getPlainText()
    const idirPassword = (await entry.getProperty(SVC_IDIR_SPEC.fields.PASSWORD.name))
    return `Basic ${Buffer.from(idirUsername + ':' + idirPassword.getPlainText(), 'utf8').toString('base64')}`
  }

  static async jira(): Promise<AxiosJiraClient> {
    const idirAuthorizationHeader = await AxiosFactory.createIdirAuthorizationHeader()
    return new AxiosJiraClient(idirAuthorizationHeader)
  }

  static async bitBucket(): Promise<AxiosBitBucketClient> {
    const idirAuthorizationHeader = await AxiosFactory.createIdirAuthorizationHeader()
    return new AxiosBitBucketClient(idirAuthorizationHeader)
  }
}
