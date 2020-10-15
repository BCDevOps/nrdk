import {expect, test} from '@oclif/test'
import GitCheckout from '../../../src/commands/backlog/checkout'
import sinon from 'sinon'
import * as MochaNockBack from '../../util/mocha-nock-back'
import {SecretManager} from '../../../src/api/service/secret-manager'

describe('backlog:checkout', () => {
  const mock_cwd = '/tmp/.mock'
  beforeEach(MochaNockBack.beforeEach())
  afterEach(MochaNockBack.afterEach)

  test
  .stub(SecretManager.prototype, 'promptMissingFields', sinon.stub().resolves({UPN: 'semeone@localhost', PASSWORD: '--'}))
  .stub(GitCheckout.prototype, 'cwd', sinon.stub().resolves(mock_cwd))
  .stub(GitCheckout.prototype, '_spawn', sinon.stub()
  .callsFake(async (...args) => {
    if (sinon.match.array.deepEquals(['git', ['rev-parse', '--show-toplevel']]).test(args)) {
      return {status: 0, stdout: mock_cwd}
    }
    if (sinon.match.array.deepEquals(['git', ['config', '--get', 'remote.origin.url'], {cwd: mock_cwd}]).test(args)) {
      return {status: 0, stdout: 'https://bwa.nrs.gov.bc.ca/int/stash/scm/IRS/irs-war.git'}
    }
    if (sinon.match.array.deepEquals(['git', ['fetch', 'origin'], {cwd: mock_cwd}]).test(args)) {
      return {status: 0, stdout: 'Done'}
    }
    if (sinon.match.array.deepEquals(['git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], {cwd: mock_cwd}]).test(args)) {
      return {status: 0, stdout: 'origin/feature/IRS-216'}
    }
    if (sinon.match.array.deepEquals(['git', ['rebase', 'origin/feature/IRS-216'], {cwd: mock_cwd}]).test(args)) {
      return {status: 0, stdout: 'Done'}
    }
    throw new Error(`Unexpected spawn call!\n${JSON.stringify(args)}`)
  }))
  .stdout()
  .command(['backlog:checkout', 'IRS-216'])
  .it('all good', ctx => {
    expect(ctx.stdout.split('\n')).to.include.members(
      [
        'Finding RFC for issue IRS-216/135218',
        'Found RFC IRS-215/135773',
        'Updating local branch with remote branch',
      ]
    )
  })
})
