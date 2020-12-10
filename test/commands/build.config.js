'use strict'
const path = require('path')
const fs = require('fs')

module.exports = class {
  constructor(options) {
    this.options = options || {}
  }

  build() {
    const idirCredLocation = path.resolve(require('os').homedir(), '.idir.cred.json')
    let idir = {username: 'xx', password: 'yy'}
    if (fs.existsSync(idirCredLocation)) {
      idir = require(idirCredLocation)
    }
    return {
      options: this.options,
      jiraUrl: 'bwa.nrs.gov.bc.ca/int/jira',
      phases: {
        dlvr: {credentials: {idir: {user: idir.username, pass: idir.password}}},
      },
    }
  }
}
