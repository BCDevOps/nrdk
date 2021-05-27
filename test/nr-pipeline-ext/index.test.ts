import {expect, test} from '@oclif/test'

import {
  BasicCustomError,
  BasicFunctionalTester,
  BasicJavaApplicationClean,
  childProcess,
  CONST,
  GitOperation,
  VERIFY_STATUS,
} from '../../src/nr-pipeline-ext'

describe('index', () => {
  test
  .it('requires', () => {
    expect(BasicCustomError).to.be.a('function')
    expect(BasicFunctionalTester).to.be.a('function')
    expect(BasicJavaApplicationClean).to.be.a('function')
    expect(childProcess).to.be.a('function')
    expect(CONST.ENV.BUILD).to.be.a('string')
    expect(GitOperation).to.be.a('function')
    expect(VERIFY_STATUS.READY).to.be.a('string')
  })
})
