import {expect, test} from '@oclif/test'
import GitCheckin from '../../../src/commands/backlog/checkin'
import sinon from 'sinon'
import * as MochaNockBack from '../../util/mocha-nock-back'
import {AxiosJiraClient} from '../../../src/api/service/axios-jira-client'
import {AxiosBitBucketClient} from '../../../src/api/service/axios-bitbucket-client'
import {SecretManager} from '../../../src/api/service/secret-manager'

describe.skip('backlog:checkin', () => {
  beforeEach(MochaNockBack.beforeEach())
  afterEach(MochaNockBack.afterEach)

  test
  .stub(SecretManager.prototype, 'promptMissingFields', sinon.stub().resolves({UPN: 'semeone@localhost', PASSWORD: '--'}))
  .stub(GitCheckin.prototype, '_spawn', sinon.stub()
  .callsFake(async (...args) => {
    if (sinon.match.array.deepEquals(['git', ['rev-parse', '--show-toplevel']]).test(args)) {
      return {status: 0, stdout: '/tmp/.mock3'}
    }
    if (sinon.match.array.deepEquals(['git', ['push', 'origin']]).test(args)) {
      return {status: 0, stdout: 'Done'}
    }
    if (sinon.match.array.deepEquals(['git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']]).test(args)) {
      return {status: 0, stdout: 'origin/feature/IRS-215'}
    }
    throw new Error(`Unexpected spawn call!\n${JSON.stringify(args)}`)
  }))
  .stdout()
  .command(['backlog:checkin'])
  .it('branch=true,pr=true', ctx => {
    expect(ctx.stdout.split('\n')).to.include.members(
      [
        'Pull Request #13 has been updated',
      ]
    )
  })

  test
  .stub(SecretManager.prototype, 'promptMissingFields', sinon.stub().resolves({UPN: 'semeone@localhost', PASSWORD: '--'}))
  .stub(AxiosJiraClient.prototype, 'getBranches', sinon.stub().resolves({branches: [], pullRequests: []}))
  .stub(GitCheckin.prototype, '_spawn', sinon.stub()
  .callsFake(async (...args) => {
    if (sinon.match.array.deepEquals(['git', ['rev-parse', '--show-toplevel']]).test(args)) {
      return {status: 0, stdout: '/tmp/.mock3'}
    }
    if (sinon.match.array.deepEquals(['git', ['push', 'origin']]).test(args)) {
      return {status: 0, stdout: 'Done'}
    }
    if (sinon.match.array.deepEquals(['git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']]).test(args)) {
      return {status: 0, stdout: 'origin/feature/IRS-21'}
    }
    throw new Error(`Unexpected spawn call!\n${JSON.stringify(args)}`)
  }))
  .stdout()
  .command(['backlog:checkin'])
  .exit(2)
  .it('branch=false,pr=false', ctx => {
    expect(ctx.stdout.split('\n')).to.include.members(
      [
        'expectedCurrentTrackingBranchName origin/feature/IRS-216',
      ]
    )
  })

  test
  .stub(SecretManager.prototype, 'promptMissingFields', sinon.stub().resolves({UPN: 'semeone@localhost', PASSWORD: '--'}))
  .stub(AxiosJiraClient.prototype, 'getBranches', sinon.stub().resolves(
    {branches: [
      {
        name: 'feature/IRS-216',
        url: 'https://apps.nrs.gov.bc.ca/int/stash/projects/IRS/repos/irs-war/commits?until=refs/heads/feature/IRS-216',
      },
    ], pullRequests: []})
  )
  .stub(AxiosBitBucketClient.prototype, 'createPullRequest', sinon.stub().resolves({id: 13}))
  .stub(GitCheckin.prototype, '_spawn', sinon.stub()
  .callsFake(async (...args) => {
    if (sinon.match.array.deepEquals(['git', ['rev-parse', '--show-toplevel']]).test(args)) {
      return {status: 0, stdout: '/tmp/.mock3'}
    }
    if (sinon.match.array.deepEquals(['git', ['push', 'origin']]).test(args)) {
      return {status: 0, stdout: 'Done'}
    }
    if (sinon.match.array.deepEquals(['git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']]).test(args)) {
      return {status: 0, stdout: 'origin/feature/IRS-216'}
    }
    throw new Error(`Unexpected spawn call!\n${JSON.stringify(args)}`)
  }))
  .stdout()
  .command(['backlog:checkin'])
  .it('branch=true,pr=false', ctx => {
    expect(ctx.stdout.split('\n')).to.include.members(
      [
        'Creating pull request for branch feature/IRS-216 ....',
        'Pull Request #13 has been created',
      ]
    )
  })
})
