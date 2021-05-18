import {expect, test} from '@oclif/test'

describe('tool:terraform', () => {
  test
  .stdout()
  .command(['tool:terraform'])
  .it('runs tool:terraform', ctx => {
    expect(ctx.stdout).to.contain('Show this help output, or the help for a specified subcommand.')
  })

  test
  .stdout()
  .command(['tool:terraform', '-help'])
  .it('runs terraform:tool help', ctx => {
    expect(ctx.stdout).to.contain('Show this help output, or the help for a specified subcommand.')
  })

  test
  .stdout()
  .command(['tool:terraform', '-version'])
  .it('runs tool:terraform -version', ctx => {
    expect(ctx.stdout).to.match(/\nTerraform v\d+\.\d+\.\d+/)
  })

  test
  .stdout()
  .command(['tool:terraform', 'init'])
  .it('runs terraform:tool init', ctx => {
    expect(ctx.stdout).to.contain('Terraform initialized in an empty directory!')
  })

  test
  .stderr()
  .command(['tool:terraform', 'plan'])
  .it('runs terraform:tool plan', ctx => {
    expect(ctx.stderr).to.contain('Error: No configuration files')
  })

  test
  .stdout()
  .command(['tool:terraform', 'validate'])
  .it('runs terraform:tool validate', ctx => {
    expect(ctx.stdout).to.contain('Success! The configuration is valid.')
  })
})
