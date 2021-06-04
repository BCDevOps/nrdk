import expect from 'expect'
import {previousEnv, childProcess} from '../../src/nr-pipeline-ext/util-functions'
import {ENV} from '../../src/nr-pipeline-ext/constants'

describe('previousEnv:', function () {
  it('Get previous stage based on env', function () {
    expect(previousEnv(ENV.PROD)).toBe(ENV.TEST)

    expect(previousEnv(ENV.TEST)).toBe(ENV.DLVR)

    expect(previousEnv(ENV.DLVR)).toBe(ENV.BUILD)
  })

  it('Unknown Env, should throw', function () {
    expect(() => previousEnv('unknown-env')).toThrow()
  })
})

describe('childProcess:', function () {
  this.timeout(50000)
  context('Spawn bash command operations', function () {
    it("Can run 'ls' command", function () {
      return childProcess('ls').then((result: any) => {
        expect(result.exitCode).toBe(0)
      })
    })

    it("With 'fake' command, it throws", async function () {
      return expect(childProcess('fakeCmd')).rejects.toThrow()
    })
  })
})
