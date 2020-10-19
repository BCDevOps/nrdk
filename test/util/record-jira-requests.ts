import * as nock from 'nock'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

// eslint-disable-next-line complexity
function cleanFields(fields: any) {
  for (const field of Object.keys(fields)) {
    const value = fields[field]
    if (value === null) {
      delete fields[field]
    } else if (field === 'creator' || field === 'reporter' || field === 'assignee' || field === 'aggregateprogress' || field === 'timetracking' || field === 'subtasks' || field === 'workratio' || field === 'worklog' || field === 'watches' || field === 'votes' || field === 'progress' || field === 'comment' || field === 'customfield_11200' || field === 'customfield_10009' || field === 'customfield_10500' || field === 'customfield_10800') {
      delete fields[field]
    } else if (field.startsWith('customfield_') &&
      !(
        field === 'customfield_10126' /* Deployed in Environment */ ||
        field === 'customfield_10130' /* Environment */ ||
        field === 'customfield_10121' /* Target Environment */
      )) {
      delete fields[field]
    } else {
      const values = []
      if (Array.isArray(value)) {
        values.push(...value)
      } else {
        values.push(value)
      }
      for (const v of values) {
        if (v.self) delete v.self
        if (v.avatarUrls) delete v.avatarUrls
        if (v.emailAddress) delete v.emailAddress
        if (v.displayName) delete v.displayName
        if (v.iconUrl) delete v.iconUrl
        if (typeof value === 'object') {
          cleanFields(value)
        }
      }
    }
  }
}
export function sanitizeNockDefinition(nockCall: nock.Definition) {
  delete nockCall.reqheaders
  // eslint-disable-next-line dot-notation
  delete ((nockCall as unknown) as any)['rawHeaders']
  const response = ((nockCall.response as unknown) as any)

  if (nockCall.path.match(/int\/jira\/rest\/api\/2\/issue\//g)) {
    cleanFields(response.fields)
    if (response.self) delete response.self
  } else if (nockCall.path.match(/int\/jira\/rest\/api\/2\/search\?/g)) {
    // console.log('here')
    for (const issue of response.issues) {
      cleanFields(issue.fields)
    }
    if (response.self) delete response.self
  } else if (nockCall.path.match(/int\/jira\/rest\/dev-status\/1\.0\/issue\/detail/g)) {
    if (response.detail) {
      for (const detail of response.detail) {
        if (detail.pullRequests) {
          // eslint-disable-next-line max-depth
          for (const pullRequest of detail.pullRequests) {
            pullRequest.author = {name: 'Somebody'}
            pullRequest.reviewers = []
          }
        }
      }
    }
    if (response?.self) delete response.self
  } else {
    throw new Error(`I don't know how to parse/save URLs from ${nockCall.path}`)
  }
}

export function saveJiraRequests(nockCalls: nock.Definition[]) {
  for (const nockCall of nockCalls) {
    // eslint-disable-next-line no-console
    console.info(`Saving request from ${nockCall.scope} ${nockCall.path}`)
    const checksum = crypto.createHash('sha256').update(JSON.stringify({method: nockCall.method, path: nockCall.path, status: nockCall.status}), 'utf8').digest('hex')
    let mockPath = path.resolve(__dirname, `../__mocks/${checksum}.json`)
    if (nockCall.path.match(/int\/jira\/rest\/api\/2\/issue\//g)) {
      const response = ((nockCall.response as unknown) as any)
      mockPath = path.resolve(__dirname, `../__mocks/jira/issue/${response.key}-${checksum}.json`)
    } else if (nockCall.path.match(/int\/jira\/rest\/api\/2\/search\?/g)) {
      mockPath = path.resolve(__dirname, `../__mocks/jira/search/${checksum}.json`)
    } else if (nockCall.path.match(/int\/jira\/rest\/dev-status\/1\.0\/issue\/detail/g)) {
      mockPath = path.resolve(__dirname, `../__mocks/jira/dev-status/issue/detail-${checksum}.json`)
    }
    fs.mkdirSync(path.dirname(mockPath), {recursive: true})
    fs.writeFileSync(mockPath, JSON.stringify(nockCall, null, 2))
  }
}
