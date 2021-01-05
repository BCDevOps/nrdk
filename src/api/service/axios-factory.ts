import {SecretManager, SVC_IDIR_SPEC} from './secret-manager'
import {AxiosJiraClient} from './axios-jira-client'
import {AxiosBitBucketClient} from './axios-bitbucket-client'

export class AxiosFactory {
  static getSecretManager() {
    return SecretManager.getInstance()
  }

  static async createIdirAuthorizationHeader() {
    const entry = await (AxiosFactory.getSecretManager()).getEntry(SVC_IDIR_SPEC)
    const idirUsername = (await entry.getProperty(SVC_IDIR_SPEC.fields.UPN.name)).getPlainText()
    const idirPassword = (await entry.getProperty(SVC_IDIR_SPEC.fields.PASSWORD.name))
    return `Basic ${Buffer.from(idirUsername + ':' + idirPassword.getPlainText(), 'utf8').toString('base64')}`
  }

  static jira(): AxiosJiraClient {
    return new AxiosJiraClient(this.createIdirAuthorizationHeader())
  }

  static bitBucket(): AxiosBitBucketClient {
    return new AxiosBitBucketClient(this.createIdirAuthorizationHeader())
  }
}
