import {expect, test} from '@oclif/test'

describe('tool:terraform', () => {
  test
  .stdout()
  .command(['tool:terraform'])
  .it('runs tool:terraform', ctx => {
    expect(ctx.stdout).to.contain('Please run with the flag --help')
  })

  test
  .stdout()
  .command(['tool:terraform', '-h'])
  .exit(0)
  .it('runs terraform:tool help', ctx => {
    expect(ctx.stdout).to.contain('terraform wrapper help')
  })

  test
  .stdout()
  .command(['tool:terraform', '-c', '--', '--version'])
  .it('runs tool:terraform -c -- --version', ctx => {
    expect(ctx.stdout).to.contain('Using /tmp/.nrdk/terraform/')
  })

  test
  .stdout()
  .command(['tool:terraform', '-v'])
  .it('runs tool:terraform -v', ctx => {
    expect(ctx.stdout).to.contain('Using /tmp/.nrdk/terraform')
  })
})
