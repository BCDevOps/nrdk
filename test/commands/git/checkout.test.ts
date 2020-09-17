import {expect, test} from '@oclif/test'

describe.skip('git:checkout', () => {
  test
  .stdout()
  .command(['git:checkout'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['git:checkout', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
