import {expect, test} from '@oclif/test'

describe.skip('util:maven:setup', () => {
  test
  .stdout()
  .command(['util:maven:setup'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['util:maven:setup', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
