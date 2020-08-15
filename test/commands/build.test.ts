import {FlagNames} from '../../src/flags'
import {expect, test} from '@oclif/test'
describe('build', () => {
  test
  .stdout()
  .command([
    'build',
    `--${FlagNames.CONFIG_SCRIPT}`,
    `${__dirname}/build.config.js`,
    `--${FlagNames.BUILD_SCRIPT}`,
    `${__dirname}/build.build.js`,
  ])
  .it('runs build', ctx => {
    expect(ctx.stdout).to.equal('Build started\nBuild finished\n')
  })
})
