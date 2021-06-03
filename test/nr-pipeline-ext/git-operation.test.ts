'use strict'
const expect = require('expect')
const sinon = require('sinon')
const sandbox = sinon.createSandbox()
const GitClient = require('../lib/GitOperation')
const {childProcess} = require('../lib/util-functions')
const path = require('path')

describe('GitOperation:', function () {
  this.timeout(50000)
  const tempDir = path.join(__dirname, 'tmp/nr-pipeline-ext-PZTj7Z')
  beforeEach(async function () {
    sandbox.restore()
    const fs = require('fs')
    await new Promise((resolve, reject) => {
      fs.rmdir(tempDir, {recursive: true}, err => {
        if (err) throw err
        resolve(true)
      })
    })
  })

  afterEach(async function () {
    sandbox.restore()
    const fs = require('fs')
    await new Promise((resolve, reject) => {
      fs.rmdir(tempDir, {recursive: true}, err => {
        if (err) throw err
        resolve(true)
      })
    })
  })

  // system test, requires credential from "./idir.local.json" (create one if not exists)
  context('prepare() @slow', function () {
    it.skip('When successfully prepared, repo directory is returned.', function () {
      // @ts-ignore
      // eslint-disable-next-line require-path-exists/exists
      const idir = require('./idir.local.json')
      // const gitCredentials = {username: 'fakeUsername', password: 'fakePass', email: 'fakeEmail'}
      const gitCredentials = {username: idir.user, password: idir.pass, email: 'fakeEmail'}
      const git = new GitClient(
        '/Users/iliu/Workspace/labs/tempDir',
        'https://bwa.nrs.gov.bc.ca/int/stash/scm/spi/spi-schema-da-review.git',
        gitCredentials,
        'test',
      )
      return git.prepare().then(result => {
        expect(result).not.toBeNull()
      })
    })
  })

  context('isTargetBranchOutofSync()', function () {
    it.skip('is not up to date', function () {
      const fs = require('fs')
      return expect(
        new Promise(resolve => {
          fs.rmdir(tempDir, {recursive: true}, err => {
            if (err) throw err
            resolve(tempDir)
          })
        })
        .then(async basedir => {
          const pwd = path.join(basedir, 'a')
          // console.log(`\ngit init ${pwd}`)
          await childProcess('git', ['init', pwd])
          await childProcess('git', ['config', '--local', 'user.email', 'you@example.com'], {cwd: pwd})
          await childProcess('git', ['config', '--local', 'user.name', 'Your Name'], {cwd: pwd})
          fs.writeFileSync(path.join(pwd, 'hello'), 'Hello', {encoding: 'utf8'})
          await childProcess('git', ['add', 'hello'], {cwd: pwd})
          await childProcess('git', ['commit', '-m', '1st Commit'], {cwd: pwd})
          await childProcess('git', ['checkout', '-b', 'feature/a'], {cwd: pwd})
          fs.writeFileSync(path.join(pwd, 'hello'), ' world!', {encoding: 'utf8', flag: 'a'})
          await childProcess('git', ['add', 'hello'], {cwd: pwd})
          await childProcess('git', ['commit', '-m', '2nd Commit'], {cwd: pwd})
          await childProcess('git', ['checkout', 'master'], {cwd: pwd})
          fs.writeFileSync(path.join(pwd, 'hello'), ' people!', {encoding: 'utf8', flag: 'a'})
          await childProcess('git', ['add', 'hello'], {cwd: pwd})
          await childProcess('git', ['commit', '-m', '3rd Commit'], {cwd: pwd})
          await childProcess('git', ['checkout', 'feature/a'], {cwd: pwd})
          return basedir
        })
        .then(async basedir => {
          const pwd = path.join(basedir, 'b')
          await childProcess('git', ['clone', path.join(basedir, 'a'), pwd])
          await childProcess('git', ['config', '--local', 'user.email', 'you@example.com'], {cwd: pwd})
          await childProcess('git', ['config', '--local', 'user.name', 'Your Name'], {cwd: pwd})
          return pwd
        })
        .then(pwd => {
          const settings = {dir: pwd, branch: {name: 'feature/a'}, change: {target: 'master'}}
          const git = new GitClient(settings)
          const stub = sandbox.stub(git, '_setupCredentials')
          stub.callsFake(() => {
            return Promise.resolve()
          })
          return git.isTargetBranchOutofSync().finally(() => {
            git.clear()
          })
        }),
      ).rejects.toThrow()
    })
    it.skip('is up to date', function () {
      const fs = require('fs')
      return expect(
        new Promise(resolve => {
          fs.rmdir(tempDir, {recursive: true}, err => {
            if (err) throw err
            resolve(tempDir)
          })
        })
        .then(async basedir => {
          const pwd = path.join(basedir, 'a')
          // console.log(`\ngit init ${pwd}`)
          await childProcess('git', ['init', pwd])
          await childProcess('git', ['config', '--local', 'user.email', 'you@example.com'], {cwd: pwd})
          await childProcess('git', ['config', '--local', 'user.name', 'Your Name'], {cwd: pwd})
          fs.writeFileSync(path.join(pwd, 'hello'), 'Hello', {encoding: 'utf8'})
          await childProcess('git', ['add', 'hello'], {cwd: pwd})
          await childProcess('git', ['commit', '-m', '1st Commit'], {cwd: pwd})
          await childProcess('git', ['checkout', '-b', 'feature/a'], {cwd: pwd})
          fs.writeFileSync(path.join(pwd, 'hello'), ' world!', {encoding: 'utf8', flag: 'a'})
          await childProcess('git', ['add', 'hello'], {cwd: pwd})
          await childProcess('git', ['commit', '-m', '2nd Commit'], {cwd: pwd})
          await childProcess('git', ['checkout', 'master'], {cwd: pwd})
          return basedir
        })
        .then(async basedir => {
          const pwd = path.join(basedir, 'b')
          await childProcess('git', ['clone', path.join(basedir, 'a'), pwd])
          await childProcess('git', ['config', '--local', 'user.email', 'you@example.com'], {cwd: pwd})
          await childProcess('git', ['config', '--local', 'user.name', 'Your Name'], {cwd: pwd})
          return pwd
        })
        .then(pwd => {
          const settings = {
            dir: pwd,
            url: 'file://localhost/abc.git',
            credentials: {username: 'test', password: '123'},
            branch: {name: 'feature/a'},
            change: {target: 'master'},
          }
          const git = new GitClient(settings)
          return git.isTargetBranchOutofSync().finally(val => {
            git.clear()
          })
        }),
      ).resolves.toBe(true)
    })
  })
})
