import {parseFlagsAsNestedObject} from '../../src/flags'
import {expect} from '@oclif/test'
describe('flags', () => {
  it('parseFlagsAsNestedObject', () => {
    const flags = {'git.branch.name': 'local', 'git.remote.url': 'url'}
    const options = parseFlagsAsNestedObject(flags)
    expect(options).to.eql({git: {branch: {name: 'local'}, remote: {url: 'url'}}})
  })
})
