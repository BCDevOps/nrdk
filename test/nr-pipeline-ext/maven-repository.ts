'use strict'
const expect = require('expect')
const MavenRepository = require('../lib/MavenRepository')
const fs = require('fs')

describe.skip('MavenRepository', function () {
  this.timeout(50000)
  context('cache', function () {
    it('fetch from public repository', function () {
      const repo = new MavenRepository('https://repo1.maven.org/maven2')
      return repo
      .cache({groupId: 'org.liquibase', artifactId: 'liquibase-core', version: '3.5.3'})
      .then(file => {
        expect(file).not.toBeUndefined()
        expect(file).not.toBeNull()
        expect(fs.existsSync(file)).toBe(true)
      })
    })

    it('fetch from private repository', function () {
      // eslint-disable-next-line require-path-exists/exists
      const idir = require('./idir.local.json')
      const repo = new MavenRepository('https://bwa.nrs.gov.bc.ca/int/artifactory/libs-release', idir)
      return repo
      .cache({groupId: 'org.liquibase', artifactId: 'liquibase-core', version: '3.5.3', ext: 'pom'})
      .then(file => {
        expect(file).not.toBeUndefined()
        expect(file).not.toBeNull()
        expect(fs.existsSync(file)).toBe(true)
      })
    })
  })
  it('clear cache', function () {
    const repo = new MavenRepository('https://repo1.maven.org/maven2')
    return repo.clear().then(cacheDir => {
      expect(fs.existsSync(cacheDir)).toBe(false)
    })
  })
})
