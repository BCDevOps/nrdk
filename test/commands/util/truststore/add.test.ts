import {expect, test} from '@oclif/test'

describe.skip('util:truststore:add', () => {
  test
  .stdout()
  .command(['util:truststore:add'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['util:truststore:add', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
