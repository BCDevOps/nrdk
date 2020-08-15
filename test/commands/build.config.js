'use strict'
module.paths.push(...require.main.paths.slice(0, 3)) // required hack to use module dependencies!
module.exports = class {
  constructor(options) {
    this.options = options || {}
  }

  build() {
    const idirCredLocation = require('path').resolve(require('os').homedir(), '.idir.cred.json')
    const idir = require(idirCredLocation)
    return {
      options: this.options,
      jiraUrl: 'bwa.nrs.gov.bc.ca/int/jira',
      phases: {
        dlvr: {credentials: {idir: {user: idir.username, pass: idir.password}}},
      },
    }
  }
}
