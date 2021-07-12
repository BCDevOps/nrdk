import * as path from 'path'
import {isPlainObject, isString} from 'lodash'
import {debug} from 'debug'
import {spawn, spawnSync} from 'child_process'
import {OpenShiftResourceSelector} from './openshift-resource-selector'
import {OpenShiftStaticSelector} from './openshift-static-selector'
import {Util as util} from './util'

'use strict'

const {isArray} = Array

const logger = {
  info: debug('info:OpenShiftClient'),
  trace: debug('trace:OpenShiftClient'),
}

function appendCommandArg(prefix: string, item: any, result: string[]) {
  if (Array.isArray(item)) {
    item.forEach(subitem => {
      return appendCommandArg(prefix, subitem, result)
    })
  } else if (!(item instanceof String || typeof item === 'string') && item instanceof Object) {
    Object.keys(item).forEach(prop => {
      appendCommandArg(`${prefix}=${prop}`, item[prop], result)
    })
  } else {
    result.push(`${prefix}=${item}`)
  }
}

export interface OpenShiftListModel {
  apiVersion: string;
  kind: string;
  items: any[];
  metadata: any;
}

/**
 * https://github.com/openshift/jenkins-client-plugin/blob/master/src/main/resources/com/openshift/jenkins/plugins/OpenShiftDSL.groovy
 */

export class OpenShiftClient {
  globalArgs: any

  options: any

  private _cwd: any

  git: any

  constructor(options: any) {
    this.globalArgs = {}
    this.options = {}

    if (options) {
      this.options = Object.assign(this.options, options)
      if (options.namespace) this.globalArgs.namespace = options.namespace
      if (options.cwd) this._cwd = options.cwd
    }
    this.git = this.options.git
  }

  namespace(ns?: string) {
    if (typeof ns !== 'undefined' && ns !== null) {
      this.globalArgs.namespace = ns
    }
    return this.globalArgs.namespace
  }

  cwd() {
    return this._cwd
  }

  buildCommonArgs(verb: string, verbArgs: any, userArgs: any, overrideArgs?: any) {
    if (userArgs !== null && !isPlainObject(userArgs)) {
      throw new Error('Expected "userArgs" to be plain object')
    }

    if (overrideArgs !== null && !isPlainObject(overrideArgs)) {
      throw new Error('Expected "userArgs" to be plain object')
    }

    const _args: any = {}
    Object.assign(_args, this.globalArgs)
    if (userArgs !== null) {
      Object.assign(_args, userArgs)
    }
    if (isPlainObject(verbArgs) && verbArgs.namespace) {
      _args.namespace = verbArgs.namespace
      delete verbArgs.namespace // eslint-disable-line no-param-reassign
    }

    if (overrideArgs !== null) {
      Object.assign(_args, overrideArgs)
    }

    const args = []
    if (_args.namespace) {
      args.push(`--namespace=${_args.namespace}`)
      delete _args.namespace
    }
    args.push(verb)
    if (isArray(verbArgs)) {
      args.push(...verbArgs)
    } else if (isPlainObject(verbArgs)) {
      args.push(...this.toCommandArgsArray(verbArgs))
    } else if (isString(verbArgs)) {
      args.push(verbArgs)
    }

    args.push(...this.toCommandArgsArray(_args))
    return args
  }

  _actionAsync(args: string[], input?: string) {
    // console.log(`> ${JSON.stringify(args)}`)
    logger.trace('>', ['oc'].concat(args).join(' '))
    // logger.trace('ocSpawn', ['oc'].concat(cmdArgs).join(' '))
    const _options: any = {encoding: 'utf-8'}
    if (this.cwd()) {
      _options.cwd = this.cwd()
    }
    // const startTime = process.hrtime();
    if (input !== null) {
      _options.input = input
    }
    const proc = spawn('oc', args, _options)

    return proc
  }

  _action(args: string[], input?: string) {
    const proc = this._rawAction(args, input)
    if (proc.status !== 0) {
      throw new Error(`command: ${['oc'].concat(args).join(' ')}\nstderr:${proc.stderr}`)
    }
    return proc
  }

  _rawAction(args: string[], input?: string) {
    logger.trace('>', ['oc'].concat(args).join(' '))
    const _options: any = {encoding: 'utf-8'}
    if (this.cwd()) {
      _options.cwd = this.cwd()
    }
    const startTime = process.hrtime()
    if (input !== null) {
      _options.input = input
    }
    const proc = spawnSync('oc', args, _options)
    const duration = process.hrtime(startTime)
    logger.info(['oc'].concat(args).join(' '), ` # (${proc.status}) [${duration[0]}s]`)

    return proc
  }

  splitNamesUsingArgs(string: string, args: string[]) {
    const namespace: string = args
    .find(item => {
      return item.startsWith('--namespace=')
    }) as string
    return this.splitNames(string, namespace.substr('--namespace='.length))
  }

  // eslint-disable-next-line class-methods-use-this
  splitNames(string: string, namespace: string) {
    const trimmed = string.trim()
    if (trimmed.length > 0) {
      const names = trimmed.split(/\n/)
      if (names.length > 0 && namespace !== null) {
        for (let i = 0; i < names.length; i += 1) {
          names[i] = `${namespace}/${names[i]}`
        }
      }
      return names
    }
    return []
  }

  _actionReturningName(args: string[]) {
    const proc = this._action(args)
    const names = this.splitNamesUsingArgs(proc.stdout, args)
    return new OpenShiftStaticSelector(this, names)
  }

  _actionReturningName2(args: string[]) {
    const proc = this._rawAction(args)
    const names = this.splitNamesUsingArgs(proc.stdout, args)
    return new OpenShiftStaticSelector(this, names)
  }

  get(object: any, args: any) {
    return this.objectDefAction('get', object, Object.assign({output: 'json'}, args || {}))
  }

  raw(verb: string, verbArgs: any, userArgs: any) {
    const args = this.buildCommonArgs(verb, verbArgs, userArgs)
    return this._action(args)
  }

  rawAsync(verb: string, verbArgs: any, userArgs: any) {
    const args = this.buildCommonArgs(verb, verbArgs, userArgs)
    return this._actionAsync(args)
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  names(_objects: any) {
    throw new Error('Not Implemented')
  }

  object(name: string, args: any) {
    return this.objects([name], args)[0]
  }

  objectOrNull(name: string, args: any) {
    const items = this.objects([name], args)
    if (items.length > 0) {
      return items[0]
    }
    return null
  }

  objects(names: string[], args: any) {
    const result: any[] = []
    const namespaces: any = {}
    names.forEach(name => {
      const parsed = util.parseName(name)
      const namespace = parsed.namespace || this.namespace()
      namespaces[namespace] = namespaces[namespace] || []
      namespaces[namespace].push(util.name(parsed))
    })

    Object.keys(namespaces).forEach(namespace => {
      const names2 = namespaces[namespace]
      const items: any = this.objectDefAction(
        'get',
        names2,
        Object.assign({output: 'json', namespace}, args || {}), // eslint-disable-line comma-dangle
      )
      result.push(...items)
    })

    return result
  }

  /**
   * returns (array)
   */
  // eslint-disable-next-line class-methods-use-this
  unwrapOpenShiftList(object: any) {
    const result = []
    if (isPlainObject(object)) {
      if (object.kind !== 'List') {
        result.push(object)
      } else if (object.items) {
        result.push(...object.items)
      }
    } else {
      throw new Error('Not Implemented')
    }
    return result
  }

  wrapOpenShiftList(object: any) {
    const list = this._emptyListModel()
    if (isArray(object)) {
      list.items.push(...object)
    } else {
      list.items.push(object)
    }
    return list
  }

  // eslint-disable-next-line class-methods-use-this
  serializableMap(jsonString: string) {
    return JSON.parse(jsonString)
  }

  toNamesList(objectOrList: any): string[] {
    if (isArray(objectOrList)) {
      const names = []
      for (let i = 0; i < objectOrList.length; i += 1) {
        const item = objectOrList[i]
        names.push(`${item.kind}/${item.metadata.name}`)
      }
      return names
    }
    if (isPlainObject(objectOrList)) {
      if (objectOrList.kind === 'List') {
        if (objectOrList.items !== null) {
          return this.toNamesList(objectOrList.items)
        }
        return []
      }
      return [`${objectOrList.kind}/${objectOrList.metadata.name}`]
    }
    throw new Error('Not Implemented')
  }

  selector(kind: string|string[], qualifier: string|any) {
    return new OpenShiftResourceSelector(this, 'selector', kind, qualifier)
  }

  process(template: string, args: any) {
    if (typeof template !== 'string') throw new Error('Expected string')
    if (util.isUrl(template)) {
      const proc = this._action(
        this.buildCommonArgs('process', ['-f', this.toFilePath(template)], args, {
          output: 'json',
        }), // eslint-disable-line comma-dangle
      )
      return this.unwrapOpenShiftList(this.serializableMap(proc.stdout))
    }
    throw new Error('Not Implemented')
  }

  // eslint-disable-next-line complexity
  objectDefAction(verb: string, object: any, userArgs: any) {
    if (!isString(object) && !isPlainObject(object) && !isArray(object)) {
      throw new Error('Expected string, plain object, or array')
    }
    if (verb === 'get' && userArgs !== null && userArgs.output === 'json') {
      const list = this._emptyListModel()
      list.items = object
      const args = this.buildCommonArgs(verb, object, userArgs, {})
      const proc = this._action(args)
      proc.stdout = proc.stdout.trim()
      if (proc.stdout === null || proc.stdout.length === 0) {
        return this.unwrapOpenShiftList(this._emptyListModel())
      }
      return this.unwrapOpenShiftList(JSON.parse(proc.stdout))
    } else if ( // eslint-disable-line no-else-return,prettier/prettier
      verb === 'get' && userArgs !== null && userArgs.output !== null && userArgs.output.startsWith('jsonpath') // eslint-disable-line prettier/prettier
    ) {
      const args = this.buildCommonArgs(verb, object, userArgs, {})
      const proc = this._action(args)
      return proc.stdout.trim().split('\n')
    } else if (verb === 'start-build') { // eslint-disable-line no-else-return,prettier/prettier
      const args = this.buildCommonArgs(verb, object, userArgs, {output: 'name'})
      logger.info(`Starting new build: ${args.join(' ')}`)
      return this._actionReturningName(args)
    } else if (verb === 'get' || verb === 'delete' || verb === 'start-build' || verb === 'process') { // eslint-disable-line no-else-return,prettier/prettier
      return this._actionReturningName(
        this.buildCommonArgs(verb, object, userArgs, {output: 'name'}), // eslint-disable-line comma-dangle
      )
    } else if ((verb === 'apply' || verb === 'create') && isArray(object)) {
      const list = this._emptyListModel()
      list.items = object
      let ignoreExitStatus = false
      if (userArgs && userArgs['ignore-exit-status'] !== null) {
        ignoreExitStatus = userArgs['ignore-exit-status']
        delete userArgs['ignore-exit-status'] // eslint-disable-line no-param-reassign
      }
      const args = this.buildCommonArgs(verb, ['-f', '-'], userArgs, {output: 'name'})
      let proc = null
      if (ignoreExitStatus) {
        proc = this._rawAction(args, JSON.stringify(list))
      } else {
        proc = this._action(args, JSON.stringify(list))
      }
      const names = this.splitNamesUsingArgs(proc.stdout, args)
      return new OpenShiftStaticSelector(this, names)
    } else if (verb === 'tag' && isArray(object)) {
      // [0] is the source
      // [1+] is the targets
      const args = this.buildCommonArgs(verb, object, userArgs, {})
      this._action(args)
      return null
    } else if ((verb === 'create' || verb === 'replace') && isString(object) && util.isUrl(object)) { // eslint-disable-line prettier/prettier
      if (userArgs['ignore-exit-status'] === true) {
        delete userArgs['ignore-exit-status'] // eslint-disable-line no-param-reassign
        return this._actionReturningName2(
          this.buildCommonArgs(verb, {filename: this.toFilePath(object)}, userArgs, {output: 'name'}) // eslint-disable-line prettier/prettier, comma-dangle
        )
      }
      return this._actionReturningName(this.buildCommonArgs(verb, {filename: this.toFilePath(object)}, userArgs, {output: 'name'})) // eslint-disable-line prettier/prettier
    } else if (verb === 'cancel-build') {
      return this._actionReturningName(this.buildCommonArgs(verb, object, userArgs))
    } else {
      throw new Error('Not Implemented')
    }
  }

  async startBuild(object: any, args: any) {
    if (isArray(object)) {
      const promises: any[] = []
      for (let i = 0; i < object.length; i += 1) {
        const item: string = object[i]
        promises.push(
          Promise.resolve(item).then(result => {
            return this.startBuild(result, args)
          }), // eslint-disable-line comma-dangle
        )
      }
      const results = await Promise.all(promises)
      return results
    } else if (isPlainObject(object)) { // eslint-disable-line no-else-return,prettier/prettier
      const _args = Object.assign({namespace: object.metadata.namespace}, args)
      return this.objectDefAction('start-build', util.name(object), _args)
    } else if (isString(object)) {
      const parsed = util.parseName(object)
      return this.objectDefAction(
        'start-build',
        util.name(parsed),
        Object.assign({namespace: parsed.namespace || this.namespace()}, args), // eslint-disable-line comma-dangle, max-len
      )
    }
    return null
  }

  cancelBuild(object: any, args: any) {
    return this.objectDefAction('cancel-build', object, args)
  }

  create(object: any, args: any) {
    return this.objectDefAction('create', object, args)
  }

  createIfMissing(object: any, args: any) {
    return this.objectDefAction(
      'create',
      object,
      Object.assign({'ignore-exit-status': true}, args),
    )
  }

  waitForImageStreamTag(tag: string) {
    let istag: any = {}
    const start = process.hrtime()

    while (((istag.image || {}).metadata || {}).name === null) {
      const istags = this.objects([`ImageStreamTag/${tag}`], {'ignore-not-found': 'true'})
      if (istags.length > 0) {
        istag = istags[0] // eslint-disable-line prefer-destructuring
      }
      if (process.hrtime(start)[0] > 60) {
        throw new Error(`Timeout waiting for ImageStreamTag/${tag} to become available`)
      }
    }
  }

  apply(object: any[], args: any) {
    const result = this.objectDefAction('apply', object, args)
    object.forEach(item => {
      if (item.kind === 'ImageStream') {
        (item.spec?.tags as any[]).forEach(tag => {
          this.waitForImageStreamTag(`${item.metadata.name}:${tag.name}`)
        })
      }
    })
    return result
  }

  replace(object: any, args: any) {
    return this.objectDefAction('replace', object, args)
  }

  delete(object: any, args: any) {
    return this.objectDefAction('delete', object, args)
  }

  // patch(){}

  /**
   *
   * @param {*} verb
   * @param {*} args
   */
  // eslint-disable-next-line class-methods-use-this
  simplePassthrough(_verb: string, _args: any) {
    throw new Error('Not Implemented')
  }

  run(args: any) {
    return this.simplePassthrough('run', args)
  }

  exec(args: any) {
    return this.simplePassthrough('exec', args)
  }

  rsh(args: any) {
    return this.simplePassthrough('rsh', args)
  }

  rsync(args: any) {
    return this.simplePassthrough('rsync', args)
  }

  tag(objects: any, args: any) {
    return this.objectDefAction('tag', objects, args)
  }

  // Utilities
  // eslint-disable-next-line class-methods-use-this
  toFileUrl(str: string) {
    if (typeof str !== 'string') {
      throw new TypeError('Expected a string')
    }

    const pathName = path.resolve(str).replace(/\\/g, '/')

    return encodeURI(`file://${pathName}`)
  }

  // eslint-disable-next-line class-methods-use-this
  toFilePath(string: string) {
    if (string.startsWith('file://')) {
      return string.substr('file://'.length)
    }
    return string
  }

  // eslint-disable-next-line class-methods-use-this
  toCommandArgsArray(args: any) {
    if (isArray(args)) return args
    const result: string[] = []
    Object.keys(args).forEach(prop => {
      const value = args[prop]
      if (value !== undefined) {
        appendCommandArg(`--${prop}`, value, result)
      }
    })
    return result
  }

  // eslint-disable-next-line class-methods-use-this
  _emptyListModel(): OpenShiftListModel {
    return {
      apiVersion: 'v1',
      kind: 'List',
      metadata: {},
      items: [],
    }
  }
}
