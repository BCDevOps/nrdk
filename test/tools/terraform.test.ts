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
  .command(['tool:terraform', '-i'])
  .it('runs tool:terraform -i', ctx => {
    expect(ctx.stdout).to.contain('TODO: install terraform')
  })

  test
  .stdout()
  .command(['tool:terraform', '-r'])
  .it('runs tool:terraform -r', ctx => {
    expect(ctx.stdout).to.contain('TODO: remove terraform')
  })

  test
  .stdout()
  .command(['tool:terraform', '-s'])
  .it('runs tool:terraform -s', ctx => {
    expect(ctx.stdout).to.contain('settings.js:')
  })

  test
  .stdout()
  .command(['tool:terraform', '-v'])
  .it('runs tool:terraform -v', ctx => {
    expect(ctx.stdout).to.contain('Terraform v')
  })
})
