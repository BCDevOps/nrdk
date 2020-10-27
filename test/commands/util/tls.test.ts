import {expect, test} from '@oclif/test'

describe('util:tls', () => {
  test
  .stdout()
  .command(['util:tls'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['util:tls', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
