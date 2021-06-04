import {expect, test} from '@oclif/test'

import {
  BasicFunctionalTester,              // ./basic-functional-tester
  BasicJavaApplicationClean,          // ./basic-java-application-clean
  ISSUE_TYPE_CODE,                    // ./constants
  BasicCustomError,                   // ./custom-error
  GitOperation,                       // ./git-operation
  childProcess,                       // ./util-functions
} from '../../src/nr-pipeline-ext'

describe('index', () => {
  test
  .it('requires', () => {
    expect(BasicFunctionalTester).to.be.a('function')
    expect(BasicJavaApplicationClean).to.be.a('function')
    expect(ISSUE_TYPE_CODE.RFD).to.be.a('string')
    expect(BasicCustomError).to.be.a('function')
    expect(GitOperation).to.be.a('function')
    expect(childProcess).to.be.a('function')
  })
})
