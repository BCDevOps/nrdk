import expect from 'expect'
import {Util} from '../../src/pipeline-cli/util'

describe('Util', () => {
  it('isUrl', () => {
    expect(Util.isUrl('http://somewhere.com/over/here')).toEqual(true)
    expect(Util.isUrl('https://somewhere.com/over/here')).toEqual(true)
    expect(Util.isUrl('file://hostname/over/here')).toEqual(true)
    expect(Util.isUrl('file://localhost/over/here')).toEqual(true)
    expect(Util.isUrl('file:///over/here')).toEqual(true)
    expect(Util.isUrl('{}')).toEqual(false)
    expect(Util.isUrl(' ///over/here')).toEqual(false)
    expect(Util.isUrl('/over/here')).toEqual(false)
    expect(Util.isUrl('//over/here')).toEqual(false)
  }).timeout(80000) // end it

  it('hashString', () => {
    expect(Util.hashString('Hello World')).toEqual('557db03de997c86a4a028e1ebd3a1ceb225be238')
    expect(Util.hashString({message: 'Hello World'})).toEqual(
      '6c0c73c8fdef129c899271509441773cea232ef6',
    )
  }).timeout(80000) // end it

  it('execSync', () => {
    expect(Util.execSync('git', ['version'], {cwd: '/tmp', encoding: 'utf-8'}).status).toEqual(0)
  }).timeout(80000)
}) // end describe
