import {AxiosInstance} from 'axios'
import axios from 'axios'

export const FIELDS = Object.freeze({
  ISSUE_TYPE: 'issuetype',
})

export class AxiosClient {
  client: AxiosInstance

  constructor(baseURL: string, idirAuthorizationHeader: string) {
    this.client = axios.create({
      baseURL: baseURL,
      timeout: 10000,
      headers: {
        Authorization: idirAuthorizationHeader,
      },
    })
  }
}
