import {expect, test} from '@oclif/test'
describe('build', () => {
  test
  .stdout()
  .command(['build', '--config-script', `${__dirname}/build.config.js`, '--build-script', `${__dirname}/build.build.js`])
  .it('runs build', ctx => {
    expect(ctx.stdout).to.equal('Build started\nBuild finished\n')
  })
})
