
/* eslint-disable no-inner-declarations */
/* eslint-disable no-useless-escape */
/* eslint-disable complexity */

import {spawnSync, SpawnSyncOptionsWithStringEncoding, SpawnSyncReturns} from 'child_process'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

export namespace Util {
  export function isArray(value: any): boolean {
    const {isArray} = Array
    return isArray(value)
  }

  export function isPlainObject(value: any): boolean {
    return require('lodash.isplainobject')(value)
  }

  export function isString(value: any): boolean {
    return require('lodash.isstring')(value)
  }

  export function normalizeKind(kind: any): any {
    if (kind === 'ImageStream') {
      return 'imagestream.image.openshift.io'
    }
    if (kind === 'BuildConfig') {
      return 'buildconfig.build.openshift.io'
    }
    return kind
  }

  export function isUrl(string: string): boolean {
    const isString = require('lodash.isstring')
    const protocolAndDomainRE = /^(?:\w+)+:\/\/(\S+)$/
    if (!isString(string)) return false
    const match = string.match(protocolAndDomainRE)
    if (!match) return false
    return true
  }

  export function name(resource: any): string {
    if (resource.kind && resource.name) return `${normalizeKind(resource.kind)}/${resource.name}`
    return `${normalizeKind(resource.kind)}/${resource.metadata.name}`
  }

  export function parseName(name: string, defaultNamespace?: string) {
    const nameRegexPattern = '^(?:([^/]+?)/)?(([^/]+?)/(.*?))$'
    const result: any = new RegExp(nameRegexPattern, 'g').exec(name)
    return {
      namespace: result[1] || defaultNamespace,
      kind: result[3],
      name: result[4],
    }
  }

  function unsafeExecSync(command: string, args?: ReadonlyArray<string>, options?: SpawnSyncOptionsWithStringEncoding): SpawnSyncReturns<string> {
    const ret = spawnSync(command, args, options)
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

  export function hashString(itemAsString: any): string {
    const shasum = crypto.createHash('sha1')
    shasum.update(`blob ${itemAsString.length + 1}\0${itemAsString}\n`)

    return shasum.digest('hex')
  }

  export function hashObject(resource: any): string {
    const itemAsString = JSON.stringify(resource)
    return hashString(itemAsString)
  }

  export function fullName(resource: any): string {
    if (resource.namespace && resource.kind && resource.name) {
      return `${resource.namespace}/${normalizeKind(resource.kind)}/${resource.name}`
    }
    return `${resource.metadata.namespace}/${normalizeKind(resource.kind)}/${resource.metadata.name}`
  }

  export function execSync(command: string, args: string[], options: any) {
    const ret = unsafeExecSync(command, args, options)
    if (ret.status !== 0) {
      throw new Error(
        `Failed running '${command} ${args.join(' ')}' (${options.cwd}) as it returned ${ret.status}`,
      )
    }
    return ret
  }

  function _hashDirectory(dir: string) {
    const result: string[] = []
    const items: string[] = fs.readdirSync(dir).sort()

    items.forEach(item => {
      const fullpath = path.join(dir, item)
      const stat = fs.statSync(fullpath)
      if (stat.isDirectory()) {
        result.push(..._hashDirectory(fullpath))
      } else {
        result.push(hashString(fs.readFileSync(fullpath)))
      }
    })
    return result
  }

  export function hashDirectory(dir: string): string {
    const items: string[] = _hashDirectory(dir)
    return hashObject(items)
  }

  function getBuildConfigStrategy(bc: any): any {
    return bc.spec.strategy.sourceStrategy || bc.spec.strategy.dockerStrategy
  }

  export function getBuildConfigInputImages(bc: any): any[] {
    const result = []
    const buildStrategy = getBuildConfigStrategy(bc)

    if (buildStrategy.from) {
      result.push(buildStrategy.from)
    }

    if ((bc.spec.source || {}).images) {
      const sourceImages: any[] = bc.spec.source.images
      sourceImages.forEach(sourceImage => {
        result.push(sourceImage.from)
      })
    }

    return result
  }

  export function applyArgumentsDefaults(options: any) {
    options.git = options.git || {}
    const git = options.git

    if (!git.dir) {
      const gitCmd = unsafeExecSync('git', ['rev-parse', '--show-toplevel'], {encoding: 'utf-8'})
      if (gitCmd.status === 0) {
        git.dir = gitCmd.stdout.trim()
      }
    }

    if (!options.cwd) {
      options.cwd = git.dir
    }

    git.branch = git.branch || {}

    if (!git.branch.name) {
      const gitCmd = unsafeExecSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {encoding: 'utf-8'})
      if (gitCmd.status === 0) {
        git.branch.name = gitCmd.stdout.trim()
      }
    }

    if (!git.branch.remote) {
      const gitConfigBranchRemote = unsafeExecSync('git', ['config', `branch.${git.branch.name}.remote`], {encoding: 'utf-8'})
      if (gitConfigBranchRemote.status === 0) {
        git.branch.remote = gitConfigBranchRemote.stdout.trim()
      } else {
      // Default to "origin"
        git.branch.remote = 'origin'
      }
    }

    if (!git.url) {
      const gitCmd = unsafeExecSync('git', ['config', '--get', `remote.${git.branch.remote}.url`], {encoding: 'utf-8'})
      if (gitCmd.status === 0) {
        git.url = gitCmd.stdout.trim()
      }
    }

    git.uri = git.url
    if (!git.http_url && git.url?.length > 0) {
      git.http_url = git.url.replace(
        /((https:\/\/github\.com\/)|(git@github.com:))([^/]+)\/(.*)/,
        'https://github.com/$4/$5',
      )
    }

    if (git.http_url?.startsWith('https://github.com') && !git.branch?.merge) {
      git.branch.merge = `refs/pull/${git.pull_request}/head`
    }

    if (!git.branch.merge) {
      const gitCmd = unsafeExecSync('git', ['config', `branch.${git.branch.name}.merge`], {encoding: 'utf-8'})
      if (gitCmd.status === 0) {
        git.branch.merge = gitCmd.stdout.trim()
      }
    }

    if (!git.owner && git.url) {
      git.owner = git.url.replace(
        /((https:\/\/github\.com\/)|(git@github.com:))([^/]+)\/(.*)/,
        '$4',
      )
    }
    if (!git.repository && git.url) {
      git.repository = git.url.replace(
        /((https:\/\/github\.com\/)|(git@github.com:))([^/]+)\/([^\.]+)\.git/,
        '$5',
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

  export function parseArgumentsFromArray(...argv: string[]) {
    const git = {}
    const options: any = {git}

    argv.forEach(value => {
      if (value.startsWith('--')) {
        value = value.substr(2)
        const sep = value.indexOf('=')
        const argName = value.substring(0, sep)
        const argValue = value.substring(sep + 1)
        if (argName.startsWith('git.')) {
          const ctxPath = argName.substr(4).split('.')
          let ctx: any = git
          ctxPath.forEach((key, index) => {
            if (index === ctxPath.length - 1) {
              ctx[key] = argValue
            } else {
              ctx[key] = ctx[key] || {}
              ctx = ctx[key]
            }
          })
        } else {
          options[argName] = argValue
        }
      }
    })
    return applyArgumentsDefaults(options)
  }

  export function normalizeName(name: string) {
    if (name.startsWith('ImageStream/')) {
      return `imagestream.image.openshift.io/${name.substr('ImageStream/'.length)}`
    }
    if (name.startsWith('BuildConfig/')) {
      return `buildconfig.build.openshift.io/${name.substr('BuildConfig/'.length)}`
    }
    return name
  }

  export function parseArguments() {
    return parseArgumentsFromArray(...process.argv.slice(2))
  }
}

