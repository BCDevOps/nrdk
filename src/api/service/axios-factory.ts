import axios from 'axios'
import {SecretManager, SVC_IDIR, SVC_IDIR_UPN, SVC_IDIR_PASSWORD} from './secret-manager'
import {AxiosJiraClient} from './axios-jira-client'
import {AxiosBitBucketClient} from './axios-bitbucket-client'

export class AxiosFactory {
  static async jira(): Promise<AxiosJiraClient> {
    const entry = (await SecretManager.getInstance()).getEntry(SVC_IDIR)
    const idirUsername = entry.getProperty(SVC_IDIR_UPN).getPlainText()
    const idirPassword = entry.getProperty(SVC_IDIR_PASSWORD)

    return new AxiosJiraClient(axios.create({
      baseURL: 'https://bwa.nrs.gov.bc.ca/int/jira',
      timeout: 10000,
      auth: {username: idirUsername, password: idirPassword.getPlainText()},
    }))
  }

  static async bitBucket(): Promise<AxiosBitBucketClient> {
    const entry = (await SecretManager.getInstance()).getEntry(SVC_IDIR)
    const idirUsername = entry.getProperty(SVC_IDIR_UPN).getPlainText()
    const idirPassword = entry.getProperty(SVC_IDIR_PASSWORD)

    return new AxiosBitBucketClient(axios.create({
      baseURL: 'https://bwa.nrs.gov.bc.ca/int/stash',
      timeout: 10000,
      auth: {username: idirUsername, password: idirPassword.getPlainText()},
    }))
  }
}
