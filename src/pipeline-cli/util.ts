
/* eslint-disable no-inner-declarations */

import {spawnSync, SpawnSyncOptionsWithStringEncoding, SpawnSyncReturns} from 'child_process'

export namespace Util {
    function unsafeExecSync(command: string, args?: ReadonlyArray<string>, options?: SpawnSyncOptionsWithStringEncoding): SpawnSyncReturns<string> {
      const ret = spawnSync(command, args, options)
      // logger.trace([command].concat(args || []).join(' '), ' - ', options, ' > ', ret.status)
      return ret as unknown as SpawnSyncReturns<string>
    }
    /*
    function execSync(command: string, args?: readonly string[], options?: SpawnSyncOptionsWithStringEncoding) {
      const ret = unsafeExecSync(command, args, options)
      if (ret.status !== 0) {
        throw new Error(
          `Failed running '${command} ${args?.join(' ')}' as it returned ${ret.status}`,
        )
      }
      return ret
    }
    */
    // eslint-disable-next-line complexity
    export function applyArgumentsDefaults(options: any) {
      options.git = options.git || {}
      const git = options.git

      if (git.dir === null) {
        // eslint-disable-next-line prettier/prettier
        const gitCmd = unsafeExecSync('git', ['rev-parse', '--show-toplevel'], {encoding: 'utf-8'})
        if (gitCmd.status === 0) {
          git.dir = gitCmd.stdout.trim()
        }
      }

      if (options.cwd === null) {
        options.cwd = git.dir
      }

      git.branch = git.branch || {}

      if (git.branch.name === null) {
        // eslint-disable-next-line prettier/prettier
        const gitCmd = unsafeExecSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {encoding: 'utf-8'})
        if (gitCmd.status === 0) {
          git.branch.name = gitCmd.stdout.trim()
        }
      }

      if (git.branch.remote === null) {
        // eslint-disable-next-line prettier/prettier
        const gitConfigBranchRemote = unsafeExecSync('git', ['config', `branch.${git.branch.name}.remote`], {encoding: 'utf-8'})
        if (gitConfigBranchRemote.status === 0) {
          git.branch.remote = gitConfigBranchRemote.stdout.trim()
        } else {
        // Default to "origin"
          git.branch.remote = 'origin'
        }
      }

      if (git.url === null) {
        // eslint-disable-next-line prettier/prettier
        const gitCmd = unsafeExecSync('git', ['config', '--get', `remote.${git.branch.remote}.url`], {encoding: 'utf-8'})
        if (gitCmd.status === 0) {
          git.url = gitCmd.stdout.trim()
        }
      }

      git.uri = git.url
      if (!git.http_url && git.url) {
        git.http_url = git.url.replace(
          /((https:\/\/github\.com\/)|(git@github.com:))([^/]+)\/(.*)/,
          'https://github.com/$4/$5', // eslint-disable-line comma-dangle
        )
      }

      if (git.http_url?.startsWith('https://github.com') && !git.branch?.merge) {
        git.branch.merge = `refs/pull/${git.pull_request}/head`
      }

      if (!git.branch.merge) {
        // eslint-disable-next-line prettier/prettier
        const gitCmd = unsafeExecSync('git', ['config', `branch.${git.branch.name}.merge`], {encoding: 'utf-8'})
        if (gitCmd.status === 0) {
          git.branch.merge = gitCmd.stdout.trim()
        }
      }

      if (!git.owner && git.url) {
        git.owner = git.url.replace(
          /((https:\/\/github\.com\/)|(git@github.com:))([^/]+)\/(.*)/,
          '$4', // eslint-disable-line comma-dangle
        )
      }
      if (!git.repository && git.url) {
        git.repository = git.url.replace(
          /((https:\/\/github\.com\/)|(git@github.com:))([^/]+)\/([^\.]+)\.git/, // eslint-disable-line no-useless-escape
          '$5', // eslint-disable-line comma-dangle
        )
      }

      if (options.pr) {
        git.pull_request = options.pr
      }
      // when --ref flag is used
      if (options.ref) {
        git.ref = options.ref
      }

      if (!git.ref) {
        if (git.pull_request) {
          git.ref = `refs/pull/${git.pull_request}/head`
        } else if (git.branch.merge) {
          git.ref = git.branch.merge
        }
      }
      if (!git.ref) {
        git.branch_ref = git.ref
      }
      return options
    }
}
