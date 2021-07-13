import {expect, test} from '@oclif/test'

import {
  BasicFunctionalTester,              // ./basic-functional-tester
  BasicJavaApplicationClean,          // ./basic-java-application-clean
  ISSUE_TYPE_CODE,                    // ./constants
  GitOperation,                       // ./git-operation
} from '../../src/nr-pipeline-ext'

describe('index', () => {
  test
  .it('requires', () => {
    expect(BasicFunctionalTester).to.be.a('function')
    expect(BasicJavaApplicationClean).to.be.a('function')
    expect(ISSUE_TYPE_CODE.RFD).to.be.a('string')
    expect(GitOperation).to.be.a('function')
  })
})
