'use strict'
const expect = require('expect')
// const sinon = require('sinon')
const {SchemaCrawler, SCHEMA_CRAWLER_VERSION} = require('../lib/SchemaCrawler')
const MavenRepository = require('../lib/MavenRepository')

const fakeConfig = {
  url: 'fakeUrl',
  user: 'fakeUser',
  password: 'fakePassword',
}

describe.skip('schemacrawler module', function () {
  this.timeout(50000)
  context('On Schemacrawler setup', function () {
    it('install without ojdbc', function () {
      const schemaCrawler = new SchemaCrawler(fakeConfig.url, fakeConfig.user, fakeConfig.password)
      return schemaCrawler.install().then(dir => {
        expect(dir).toBeDefined()
      })
    })
    it('install with ojdbc', function () {
      // @ts-ignore
      // eslint-disable-next-line require-path-exists/exists
      const idir = require('./idir.local.json')
      const schemaCrawler = new SchemaCrawler(
        fakeConfig.url,
        fakeConfig.user,
        fakeConfig.password,
        [
          {
            groupId: 'com.oracle.jdbc',
            artifactId: 'ojdbc8',
            version: '18.3.0.0',
          },
        ],
        idir,
      )
      return new MavenRepository('https://repo1.maven.org/maven2').clear()
      .then(() => {
        return schemaCrawler.install().then(dir => {
          expect(dir).toBeDefined()
        })
      })
    })
  })

  context('When checking installed version', function () {
    it('version: show correct download version', function () {
      // @ts-ignore
      // eslint-disable-next-line require-path-exists/exists
      const idir = require('./idir.local.json')
      const schemaCrawler = new SchemaCrawler(
        fakeConfig.url,
        fakeConfig.user,
        fakeConfig.password,
        [
          {
            groupId: 'com.oracle.jdbc',
            artifactId: 'ojdbc8',
            version: '18.3.0.0',
          },
        ],
        idir,
      )
      return schemaCrawler.version().then(version => {
        expect(version).toBe(SCHEMA_CRAWLER_VERSION.substring(1))
      })
    })
  })

  context('Running SchemaCrawler command', function () {
    it('runCommand: SchemaCrawler -h command executed successfully. ', function () {
      const schemaCrawler = new SchemaCrawler(fakeConfig.url, fakeConfig.user, fakeConfig.password)
      return schemaCrawler.run(['-h']).then(output => {
        expect(output.exitCode).toBe(0)
      })
    })
  })
})
