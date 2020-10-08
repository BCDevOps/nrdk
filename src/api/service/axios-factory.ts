import axios from 'axios'
import {SecretManager, SVC_IDIR_SPEC} from './secret-manager'
import {AxiosJiraClient} from './axios-jira-client'
import {AxiosBitBucketClient} from './axios-bitbucket-client'

export class AxiosFactory {
  static async jira(): Promise<AxiosJiraClient> {
    const entry = await (await SecretManager.getInstance()).getEntry(SVC_IDIR_SPEC)
    const idirUsername = (await entry.getProperty(SVC_IDIR_SPEC.fields.UPN.name)).getPlainText()
    const idirPassword = (await entry.getProperty(SVC_IDIR_SPEC.fields.PASSWORD.name))

    return new AxiosJiraClient(axios.create({
      baseURL: 'https://bwa.nrs.gov.bc.ca/int/jira',
      timeout: 10000,
      headers: {
        Authorization: `Basic ${Buffer.from(idirUsername + ':' + idirPassword.getPlainText(), 'utf8').toString('base64')}`,
      },
    }))
  }

  static async bitBucket(): Promise<AxiosBitBucketClient> {
    const entry = await (await SecretManager.getInstance()).getEntry(SVC_IDIR_SPEC)
    const idirUsername = (await entry.getProperty(SVC_IDIR_SPEC.fields.UPN.name)).getPlainText()
    const idirPassword = (await entry.getProperty(SVC_IDIR_SPEC.fields.PASSWORD.name))

    return new AxiosBitBucketClient(axios.create({
      baseURL: 'https://bwa.nrs.gov.bc.ca/int/stash',
      timeout: 10000,
      headers: {
        Authorization: `Basic ${Buffer.from(idirUsername + ':' + idirPassword.getPlainText(), 'utf8').toString('base64')}`,
      },
    }))
  }
}
