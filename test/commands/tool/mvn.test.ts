import {expect, test} from '@oclif/test'

describe('tool:mvn', () => {
  test
  .stdout()
  .command(['tool:mvn'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['tool:mvn', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
