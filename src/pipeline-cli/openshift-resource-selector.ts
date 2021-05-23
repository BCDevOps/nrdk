'use strict'

const crypto2 = require('crypto')
const fs = require('fs')
const path = require('path')
const {spawnSync} = require('child_process')
const debug = require('debug')

const logger = {
  info: debug('info:OpenShiftClient'),
  trace: debug('trace:OpenShiftClient'),
}

export class OpenShiftResourceSelector {
  client: any

  selector: string

  names: string|string[]

  qualifier: string|any

  constructor(client: any, selector: string, names: string|string[], qualifier?: string|any) {
    this.client = client
    this.selector = selector
    this.names = names
    this.qualifier = qualifier || {}
  }

  public isString = require('lodash.isstring')

  public isPlainObject = require('lodash.isplainobject')

  public isArray() {
    const {isArray} = Array
    return isArray
  }

  public hashString(itemAsString: string) {
    const shasum = crypto2.createHash('sha1')
    // var itemAsString = JSON.stringify(resource)
    shasum.update(`blob ${itemAsString.length + 1}\0${itemAsString}\n`)

    return shasum.digest('hex')
  }

  public hashObject(resource: any): string {
    // var shasum = crypto.createHash('sha1');
    const itemAsString = JSON.stringify(resource)
    // shasum.update(`blob ${itemAsString.length + 1}\0${itemAsString}\n`);
    return this.hashString(itemAsString)
  }

  public isUrl(string: string): boolean {
    const protocolAndDomainRE = /^(?:\w+)+:\/\/(\S+)$/
    if (!this.isString(string)) return false
    const match = string.match(protocolAndDomainRE)
    if (!match) return false
    return true
  }

  // TODO: shortName: (resource) => { return resource.metadata.name },
  public parseName(name: string, defaultNamespace: string): any {
    const nameRegexPattern = '^(?:([^/]+?)/)?(([^/]+?)/(.*?))$'
    const result: any = new RegExp(nameRegexPattern, 'g').exec(name)
    return {
      namespace: result[1] || defaultNamespace,
      kind: result[3],
      name: result[4],
    }
  }

  public name(resource: any): string {
    if (resource.kind && resource.name) return `${this.normalizeKind(resource.kind)}/${resource.name}`
    return `${this.normalizeKind(resource.kind)}/${resource.metadata.name}`
  }

  public fullName(resource: any): string {
    if (resource.namespace && resource.kind && resource.name) {
      return `${resource.namespace}/${this.normalizeKind(resource.kind)}/${resource.name}`
    }
    return `${resource.metadata.namespace}/${this.normalizeKind(resource.kind)}/${
      resource.metadata.name
    }`
  }

  public normalizeKind(kind: string): string {
    if (kind === 'ImageStream') return 'imagestream.image.openshift.io'
    if (kind === 'BuildConfig') return 'buildconfig.build.openshift.io'
    return kind
  }

  public normalizeName(name: string): string {
    if (name.startsWith('ImageStream/')) {
      return `imagestream.image.openshift.io/${name.substr('ImageStream/'.length)}`
    }
    if (name.startsWith('BuildConfig/')) {
      return `buildconfig.build.openshift.io/${name.substr('BuildConfig/'.length)}`
    }
    return name
  }

  public getBuildConfigInputImages(bc: any): any[] {
    const result = []
    const buildStrategy = this.getBuildConfigStrategy(bc)

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

  public getBuildConfigStrategy(bc: any) {
    return bc.spec.strategy.sourceStrategy || bc.spec.strategy.dockerStrategy
  }

  public hashDirectory(dir: string): string {
    const items = this._hashDirectory(dir)
    return this.hashObject(items)
  }

  public parseArguments() {
    return this.parseArgumentsFromArray(...process.argv.slice(2))
  }

  public parseArgumentsFromArray(...argv: string[]): any {
    const git: any = {}
    const options: any = {git}

    argv.forEach(value => {
      if (value.startsWith('--')) {
        // eslint-disable-next-line no-param-reassign
        value = value.substr(2)
        const sep = value.indexOf('=')
        const argName = value.substring(0, sep)
        const argValue = value.substring(sep + 1)
        if (argName.startsWith('git.')) {
          const ctxPath = argName.substr(4).split('.')
          let ctx = git
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
    return this.applyArgumentsDefaults(options)
  }

  public applyArgumentsDefaults(options: any): any {
    options.git = options.git || {}
    const git = options.git

    if (git.dir === null) {
      // eslint-disable-next-line prettier/prettier
      git.dir = this.execSync('git', ['rev-parse', '--show-toplevel'], {encoding: 'utf-8'}).stdout.trim()
    }

    if (options.cwd === null) {
      options.cwd = git.dir
    }

    git.branch = git.branch || {}

    if (git.branch.name === null) {
      // eslint-disable-next-line prettier/prettier
      git.branch.name = this.execSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {encoding: 'utf-8'}).stdout.trim()
    }

    if (git.branch.remote === null) {
      // eslint-disable-next-line prettier/prettier
      const gitConfigBranchRemote = this.unsafeExecSync('git', ['config', `branch.${git.branch.name}.remote`], {encoding: 'utf-8'})
      if (gitConfigBranchRemote.status > 0) {
        // Default to "origin"
        git.branch.remote = 'origin'
      } else {
        git.branch.remote = gitConfigBranchRemote.stdout.trim()
      }
    }

    if (git.url === null) {
      // eslint-disable-next-line prettier/prettier
      git.url = this.execSync('git', ['config', '--get', `remote.${git.branch.remote}.url`], {encoding: 'utf-8'}).stdout.trim()
    }

    git.uri = git.url
    if (git.http_url === null) {
      git.http_url = git.url.replace(
        /((https:\/\/github\.com\/)|(git@github.com:))([^/]+)\/(.*)/,
        'https://github.com/$4/$5', // eslint-disable-line comma-dangle
      )
    }

    if (git.http_url.startsWith('https://github.com') && !git.branch.merge) {
      git.branch.merge = `refs/pull/${git.pull_request}/head`
    }

    if (git.branch.merge === null) {
      // eslint-disable-next-line prettier/prettier
      git.branch.merge = this.execSync('git', ['config', `branch.${git.branch.name}.merge`], {encoding: 'utf-8'}).stdout.trim()
    }

    if (git.owner === null) {
      git.owner = git.url.replace(
        /((https:\/\/github\.com\/)|(git@github.com:))([^/]+)\/(.*)/,
        '$4', // eslint-disable-line comma-dangle
      )
    }
    if (git.repository === null) {
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
      } else {
        git.ref = git.branch.merge
      }
    }
    git.branch_ref = git.ref
    return options
  }

  public execSync(...args: any[]): any {
    const ret = this.unsafeExecSync(...args)
    if (ret.status !== 0) {
      throw new Error(
        `Failed running '${args}' as it returned ${ret.status}`,
      )
    }
    return ret
  }

  public unsafeExecSync(...args: any[]): any {
    const ret = spawnSync(...args)
    logger.trace([args[0]].concat(args[1]).join(' '), ' - ', args[2], ' > ', ret.status)
    return ret
  }

  private _hashDirectory(dir: string): string[] {
    const result: string[] = []
    const items: string[] = fs.readdirSync(dir).sort()

    items.forEach(item => {
      const fullpath = path.join(dir, item)
      const stat = fs.statSync(fullpath)
      if (stat.isDirectory()) {
        result.push(...this._hashDirectory(fullpath))
      } else {
        result.push(this.hashString(fs.readFileSync(fullpath)) as string)
      }
    })
    return result
  }
}
