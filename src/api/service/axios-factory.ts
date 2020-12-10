import axios from 'axios'
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
    return new AxiosJiraClient(axios.create({
      baseURL: process.env.JIRA_URL || 'https://bwa.nrs.gov.bc.ca/int/jira',
      timeout: 10000,
      headers: {
        Authorization: await AxiosFactory.createIdirAuthorizationHeader(),
      },
    }))
  }

  static async bitBucket(): Promise<AxiosBitBucketClient> {
    return new AxiosBitBucketClient(axios.create({
      baseURL: process.env.BITBUCKET_URL || 'https://bwa.nrs.gov.bc.ca/int/stash',
      timeout: 10000,
      headers: {
        Authorization: await AxiosFactory.createIdirAuthorizationHeader(),
      },
    }))
  }
}
