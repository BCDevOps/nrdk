import {AxiosInstance} from 'axios'
import axios from 'axios'

export const FIELDS = Object.freeze({
  ISSUE_TYPE: 'issuetype',
})

export interface RepositoryReference {
    cwd?: string;
    url?: string;
    slug: string;
    project: {key: string};
  }

export class AxiosClient {
    readonly client: AxiosInstance

    constructor(clientURL: string, idirAuthorizationHeader: any) {
      this.client = axios.create({
        baseURL: clientURL,
        timeout: 10000,
        headers: {
          Authorization: idirAuthorizationHeader,
        },
      })
    }
}
