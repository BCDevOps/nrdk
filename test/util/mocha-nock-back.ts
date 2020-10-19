import * as nock from 'nock'
import sanitize from 'sanitize-filename'
import * as path from 'path'
import {Definition} from 'nock'
import {sanitizeNockDefinition} from './record-jira-requests'

export function beforeEach() {
  return function (this: Mocha.Context, done: Function) {
    const testFile = (this.test as any).file as string
    const fixtures = path.join(path.dirname(testFile), '.fixtures')
    this.__nock_filenames = this.__nock_filenames ||  []
    const filename =  path.basename(testFile) + '.' + sanitize((this.currentTest as any).title + '.json').replace(' ', '_')
    // make sure we're not reusing the nock file
    if (this.__nock_filenames.indexOf(filename) !== -1) {
      return done(new Error('nock-back-mocha does not support multiple tests with the same name. ' + filename + ' cannot be reused.'))
    }
    this.__nock_filenames.push(filename)

    this.__nock_previousFixtures = nock.back.fixtures
    nock.back.fixtures = fixtures
    nock.back(filename, {afterRecord: (definitions: Definition[]): Definition[] => {
      for (const definition of definitions) {
        sanitizeNockDefinition(definition)
      }
      return definitions
    }}, function (this: Mocha.Context, nockDone: Function) {
      (this.currentTest as any).nockDone = function () {
        nockDone()
        nock.back.fixtures = this.__nock_previousFixtures
      }
      done()
    }.bind(this))
  }
}

export function afterEach(this: Mocha.Context) {
  (this.currentTest as any).nockDone()
}
