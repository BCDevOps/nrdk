import {expect, test} from '@oclif/test'

describe('tool:terraform', () => {
  test
  .stdout()
  .stderr()
  .command(['tool:terraform'])
  .exit(2)
  .it('runs tool:terraform')

  test
  .stdout()
  .command(['tool:terraform', '-h'])
  .exit(0)
  .it('runs terraform:tool help', ctx => {
    expect(ctx.stdout).to.contain('terraform wrapper help')
  })

  test
  .stdout()
  .stderr()
  .command(['tool:terraform', '-c', '--', '--version'])
  .exit(0)
  .it('runs tool:terraform -c -- --version', ctx => {
    expect(ctx.stdout).to.match(/\nTerraform v\d+\.\d+\.\d+/)
  })

  test
  .stdout()
  .command(['tool:terraform', '-v'])
  .exit(0)
  .it('runs tool:terraform -v', ctx => {
    expect(ctx.stdout).to.match(/\nUsing /)
  })
})
