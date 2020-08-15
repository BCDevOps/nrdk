import * as nock from 'nock'
import * as fs from 'fs'
import * as path from 'path'

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

export function saveJiraRequests(nockCalls: nock.Definition[]) {
  for (const nockCall of nockCalls) {
    delete nockCall.reqheaders
    // eslint-disable-next-line dot-notation
    delete ((nockCall as unknown) as any)['rawHeaders']
    const response = ((nockCall.response as unknown) as any)
    cleanFields(response.fields)
    if (response.self) delete response.self
    const mockPath = path.resolve(__dirname, `../__mocks/${response.key}.json`)
    fs.mkdirSync(path.dirname(mockPath), {recursive: true})
    fs.writeFileSync(mockPath, JSON.stringify(nockCall, null, 2))
  }
}
