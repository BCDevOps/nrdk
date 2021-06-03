'use strict'
const expect = require('expect')
const Liquibase = require('../lib/Liquibase')

describe.skip('liquibase module', function () {
  this.timeout(50000)
  context('On Liquibase setup', function () {
    it('install can be done', function () {
      // @ts-ignore
      // eslint-disable-next-line require-path-exists/exists
      const idir = require('./idir.local.json')
      const liquibaseObj = new Liquibase({
        drivers: [{groupId: 'com.oracle.jdbc', artifactId: 'ojdbc8', version: '18.3.0.0'}],
        credentials: idir,
      })

      return liquibaseObj.run(['--version'], {cwd: liquibaseObj.liquibaseHomeDir}).then(proc => {
        expect(proc.stdout.split('\n')[1]).toBe('Liquibase Version: 3.8.0')
      })
    })
  })
})
