import {expect, test} from '@oclif/test'

import {
  CONSTANTS,
  isPlainObj,
  OpenShiftClient,
  OpenShiftClientResult,
  OpenShiftClientX,
  OpenShiftResourceSelector,
  OpenShiftStaticSelector,
  Transformers,
  Util,
} from '../../src/pipeline-cli'
import * as Logger from './../../src/pipeline-cli/logger'

describe('index', () => {
  test
  .it('requires', () => {
    expect(CONSTANTS.ENV.BUILD_HASH).to.be.a('string')
    expect(isPlainObj).to.be.a('function')
    expect(Logger.warn).to.be.a('function')
    expect(OpenShiftClient).to.be.a('function')
    expect(OpenShiftClientResult).to.be.a('function')
    expect(OpenShiftClientX).to.be.a('function')
    expect(OpenShiftResourceSelector).to.be.a('function')
    expect(OpenShiftStaticSelector).to.be.a('function')
    expect(Transformers).to.be.a('function')
    expect(Util.isUrl).to.be.a('function')
  })
})
