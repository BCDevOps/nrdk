/* eslint-disable max-depth */
/* eslint-disable max-params */
/* eslint-disable no-console */
/* eslint-disable new-cap */

const {isArray} = Array
const info = require('debug')('info:OpenShiftClient')
const trace = require('debug')('trace:OpenShiftClient')

import * as path from 'path'
import * as fs from 'fs'
import {Transformers} from './transformers'
import {isPlainObj as isOpenShiftList} from './is-openshift-list'
import isPlainObject from 'lodash.isplainobject'
import {CONSTANTS} from './constants'
import {OpenShiftClient} from './openshift-client'
import {OpenShiftClientResult} from './openshift-client-result'
import {OpenShiftStaticSelector} from './openshift-static-selector'
import {Util as util} from './util'

const logger = {info, trace}

export class OpenShiftClientX extends OpenShiftClient {
  cache: any

  constructor(options: any) {
    super(options)
    this.cache = new Map()
  }

  applyBestPractices(resources: string[]|null|any): any {
    if (resources && isArray(resources)) {
      return this.applyBestPractices(this.wrapOpenShiftList(resources))
    }

    if (resources && !isOpenShiftList(resources)) {
      throw new Error('"resources" argument must be an array')
    }
    const transformers = new Transformers(this)
    resources.items.forEach((resource: string) => {
      transformers.ENSURE_METADATA(resource)
      transformers.ADD_CHECKSUM_LABEL(resource)
      transformers.ENSURE_METADATA_NAMESPACE(resource, resources)
      transformers.REMOVE_BUILD_CONFIG_TRIGGERS(resource)
      transformers.ADD_SOURCE_HASH(resource)
    })
    return resources
  }

  getLabel(resource: any, name: string) {
    resource.metadata = resource.metadata || {}
    resource.metadata.labels = resource.metadata.labels || {}
    return resource.metadata.labels[name]
  }

  setLabel(resource: any, name: any, value?: string) {
    resource.metadata = resource.metadata || {}
    resource.metadata.labels = resource.metadata.labels || {}
    if (isPlainObject(name)) {
      Object.assign(resource.metadata.labels, name)
    } else {
      resource.metadata.labels[name] = value
    }
    return resource
  }

  getAnnotation(resource: any, name: string) {
    resource.metadata = resource.metadata || {}
    resource.metadata.annotations = resource.metadata.annotations || {}
    return resource.metadata.annotations[name]
  }

  setAnnotation(resource: any, name: string, value: string) {
    resource.metadata = resource.metadata || {}
    resource.metadata.annotations = resource.metadata.annotations || {}
    if (isPlainObject(name)) {
      Object.assign(resource.metadata.annotations, name)
    } else {
      resource.metadata.annotations[name] = value
    }
  }

  // /**
  //  *
  //  * @param {array<Object>} resources The resources to be modified
  //  * @param {*} appName The name of the app.
  //  * @param {*} envName The name of the environment (e.g.: dev, test, prod)
  //  * @param {*} envId    The unique name for this environment (e.g.: dev-1, dev-2, test, prod)
  //  * @param {*} instance  The name of the instance of the app
  //  *                      (defaults to `{appName}-${envName}-${envId})
  //  */
  applyRecommendedLabels(resources: any[], appName: string, envName: string, envId: string, instance?: string) {
    if (resources && !isArray(resources)) {
      throw new Error('"resources" argument must be an array')
    }

    const commonLabels = {'app-name': appName}
    const envLabels = {
      'env-name': envName,
      'env-id': envId,
      'github-repo': this.git.repository,
      'github-owner': this.git.owner,
    }
    const allLabels = {
      app:
        instance || `${commonLabels['app-name']}-${envLabels['env-name']}-${envLabels['env-id']}`,
    }

    Object.assign(allLabels, commonLabels, envLabels)
    const mostLabels: any = Object.assign({}, allLabels)
    delete mostLabels['env-id']

    // Apply labels to the list itself
    resources.forEach((item: any) => {
      if (this.getLabel(item, 'shared') === 'true') {
        this.setLabel(item, commonLabels)
      } else {
        this.setLabel(item, allLabels)
      }
      if (item.kind === 'StatefulSet') {
        // Normalize labels to StatefulSet Selector, so that it only needs the statefulset name
        item.spec.selector = {matchLabels: {statefulset: item.metadata.name}}
        logger.info(
          `Setting StatefulSet/${item.metadata.name}.spec.selector to be ${JSON.stringify(
            item.spec.selector,
          )}`,
        )
        this.setLabel(item.spec.template, {statefulset: item.metadata.name})
        if (item.spec.volumeClaimTemplates) {
          item.spec.volumeClaimTemplates.forEach((pvc: any) => {
            pvc.metadata.labels = Object.assign({statefulset: item.metadata.name}, mostLabels)
          })
        }
      } else if (item.kind === 'DeploymentConfig') {
        // Normalize labels to DeploymentConfig Selector, so that it only needs the deploymentConfig name
        item.spec.selector = {deploymentConfig: item.metadata.name}
        logger.info(
          `Setting DeploymentConfig/${item.metadata.name}.spec.selector to be ${JSON.stringify(
            item.spec.selector,
          )}`,
        )
        this.setLabel(item.spec.template, {deploymentConfig: item.metadata.name})
      }
    })

    return resources
  }

  copyRecommendedLabels(source: any, target: any) {
    ['app', 'app-name', 'env-name', 'env-id', 'github-repo', 'github-owner'].forEach(labelName => {
      if (source[labelName]) {
        target[labelName] = source[labelName]
      }
    })
  }

  fetchSecretsAndConfigMaps(resources: any[]) {
    if (resources && !isArray(resources)) {
      throw new Error('"resources" argument must be an array')
    }

    for (let i = 0; i < resources.length; i += 1) {
      const resource = resources[i]
      if (resource.kind === 'Secret' || resource.kind === 'ConfigMap') {
        const refName = this.getAnnotation(resource, 'as-copy-of')
        if (refName) {
          const refResource = this.object(`${resource.kind}/${refName}`)
          resource.data = refResource.data
          const tmpStringData = resource.stringData || {}
          resource.stringData = {}
          if (resource.kind === 'Secret' && tmpStringData['metadata.name']) {
            resource.stringData['metadata.name'] = resource.metadata.name
          }
          const preserveFields = this.getAnnotation(resource, 'as-copy-of/preserve')
          if (resource.kind === 'Secret' && preserveFields) {
            const existingResource = this.object(
              `${resource.kind}/${resource.metadata.name}`,
              {'ignore-not-found': 'true'},
            )
            if (existingResource) {
              resource.data[preserveFields] = existingResource.data[preserveFields]
            }
          }
        }
      } else if (resource.kind === 'Route') {
        const refName = this.getAnnotation(resource, 'tls/secretName')
        if (refName) {
          const refResource = this.object(`${resource.kind}/${refName}`)
          const refData = refResource.data
          Object.keys(refData).forEach(prop => {
            refData[prop] = Buffer.from(refData[prop], 'base64').toString('ascii')
          })
          resource.spec.tls = resource.spec.tls || {}
          Object.assign(resource.spec.tls, refData)
        }
      }
    }
    return resources
  }

  _setCache(resource: any): any {
    if (isArray(resource)) {
      const entries = []
      for (let i = 0; i < resource.length; i += 1) {
        entries.push(this._setCache(resource[i]))
      }
      return entries
    }
    const resourceFullName = util.fullName(resource)
    const entry = {item: resource, fullName: resourceFullName, name: util.name(resource)}
    this.cache.set(resourceFullName, entry)
    return entry
  }

  _getCache(name: string) {
    const _names = []
    const entries = []
    const missing = []

    if (isArray(name)) {
      _names.push(...name)
    } else {
      _names.push(name)
    }

    // look for missing resources from cache
    for (let i = 0; i < _names.length; i += 1) {
      const _name = _names[i]
      const _parsed = util.parseName(_name, this.namespace())
      const _full = util.fullName(_parsed)
      const entry = this.cache.get(_full)
      if (!entry) {
        missing.push(_full)
      }
    }

    // fetch missing resources
    if (missing.length > 0) {
      const objects = this.objects(missing)
      this._setCache(objects)
    }

    // populate entries
    for (let i = 0; i < _names.length; i += 1) {
      const _name = _names[i]
      const _parsed = util.parseName(_name, this.namespace())
      const _full = util.fullName(_parsed)
      const entry = this.cache.get(_full)
      if (!entry) throw new Error(`Missing object:${_name}`)
      entries.push(entry)
    }
    return entries
  }

  getBuildStatus(buildCacheEntry: any) {
    if (!buildCacheEntry?.item) {
      return undefined
    }
    return this.cache.get(util.fullName(buildCacheEntry.item))
  }

  // /**
  //  * @param {*} buildConfig
  //  * @returns {string}  the name of the 'Build' object
  //  */
  startBuildIfNeeded(buildConfig: any) {
    const tmpfile = `/tmp/${util.hashObject(buildConfig)}.tar`
    const args: any = {wait: 'true'}
    const hashData: any = {
      source: buildConfig.metadata.labels[CONSTANTS.LABELS.SOURCE_HASH],
      images: [],
      buildConfig: buildConfig.metadata.labels[CONSTANTS.LABELS.TEMPLATE_HASH],
    }
    const contextDir = buildConfig.spec.source.contextDir || ''

    if (buildConfig.spec.source.type === 'Binary') {
      if (fs.existsSync(tmpfile)) {
        fs.unlinkSync(tmpfile)
      }
      const procArgs = ['-chf', tmpfile, buildConfig.spec.source.contextDir]
      const procOptions = {cwd: this.cwd(), encoding: 'utf-8'}
      util.execSync('tar', procArgs, procOptions)
      Object.assign(args, {'from-archive': tmpfile})
      hashData.source = util.hashDirectory(path.join(this.cwd(), contextDir))
    } else if (
      buildConfig.spec.source.type === 'Dockerfile' && buildConfig.spec.strategy.type === 'Docker'
    ) {
      hashData.source = util.hashObject(buildConfig.spec.source)
    } else {
      hashData.source = util
      .execSync('git', ['rev-parse', `HEAD:${contextDir}`], {
        cwd: this.cwd(),
        encoding: 'utf-8',
      })
      .stdout.trim()
      if (this.options['dev-mode'] === 'true') {
        Object.assign(args, {'from-dir': this.cwd()})
      }
    }

    util.getBuildConfigInputImages(buildConfig).forEach(sourceImage => {
      if (sourceImage.kind === CONSTANTS.KINDS.IMAGE_STREAM_TAG) {
        const imageName = this.object(util.name(sourceImage), {
          namespace: sourceImage.namespace || this.namespace(),
          output: 'jsonpath={.image.metadata.name}',
        })
        const imageStreamImageName = `${sourceImage.name.split(':')[0]}@${imageName}`
        logger.info(`Rewriting reference from '${sourceImage.kind}/${sourceImage.name}' to '${CONSTANTS.KINDS.IMAGE_STREAM_IMAGE}/${imageStreamImageName}'`)
        sourceImage.kind = CONSTANTS.KINDS.IMAGE_STREAM_IMAGE
        sourceImage.name = imageStreamImageName
      }
      hashData.images.push(sourceImage)
    })

    const env: any = {}
    const buildHash: string = util.hashObject(hashData)
    env[CONSTANTS.ENV.BUILD_HASH] = buildHash
    logger.trace(`${util.fullName(buildConfig)} > hashData: ${hashData}`)

    const outputTo = buildConfig.spec.output.to
    if (outputTo.kind !== CONSTANTS.KINDS.IMAGE_STREAM_TAG) {
      throw new Error(`Expected kind=${CONSTANTS.KINDS.IMAGE_STREAM_TAG}, but found kind=${outputTo.kind} for ${util.fullName(buildConfig)}.spec.output.to`)
    }
    const outputImageStream = this.object(`${CONSTANTS.KINDS.IMAGE_STREAM}/${outputTo.name.split(':')[0]}`)
    const tags = (outputImageStream.status || {}).tags || []
    let foundImageStreamImage: any = null

    while (tags.length > 0) {
      const tag = tags.shift()
      if (!foundImageStreamImage) {
        const resources = tag.items.map((image: any) => {
          return `${CONSTANTS.KINDS.IMAGE_STREAM_IMAGE}/${outputTo.name.split(':')[0]}@${image.image}`
        })
        const images = this.objects(resources)
        images.forEach(ocImageStreamImage => {
          const sourceBuild: any = {kind: CONSTANTS.KINDS.BUILD, metadata: {}}
          ocImageStreamImage.image.dockerImageMetadata.Config.Env.forEach((envLine: string) => {
            if (envLine === `${CONSTANTS.ENV.BUILD_HASH}=${buildHash}`) {
              foundImageStreamImage = ocImageStreamImage
            } else if (envLine.startsWith('OPENSHIFT_BUILD_NAME=')) {
              sourceBuild.metadata.name = envLine.split('=')[1]
            } else if (envLine.startsWith('OPENSHIFT_BUILD_NAMESPACE=')) {
              sourceBuild.metadata.namespace = envLine.split('=')[1]
            }
          })
        })
      }
    }

    if (!foundImageStreamImage) {
      console.log('Starting new build for ', util.name(buildConfig))
      this._action(
        this.buildCommonArgs(
          'set',
          ['env', util.name(buildConfig)],
          {env, overwrite: 'true'},
          {namespace: buildConfig.metadata.namespace || this.namespace()},
        ),
      )
      return super.startBuild(`${util.fullName(buildConfig)}`, args)
    }
    // If image already exists, reuse it
    console.log('Re-using image ', util.fullName(foundImageStreamImage), 'for build ', util.name(buildConfig))
    this.tag([foundImageStreamImage.metadata.name, buildConfig.spec.output.to.name])
    return new OpenShiftStaticSelector(this, [`${util.fullName(foundImageStreamImage)}`])
  }

  importImageStreams(objects: any, targetImageTag: string, sourceNamespace: string, sourceImageTag: string) {
    for (let i = 0; i < objects.length; i += 1) {
      const item = objects[i]
      if (util.normalizeKind(item.kind) === 'imagestream.image.openshift.io') {
        this.raw(
          'tag',
          [
            `${sourceNamespace}/${item.metadata.name}:${sourceImageTag}`,
            `${item.metadata.name}:${targetImageTag}`,
          ],
          {'reference-policy': 'local', namespace: item.metadata.namespace},
        )
        this.waitForImageStreamTag(`${item.metadata.name}:${targetImageTag}`)
      }
    }
    return objects
  }

  async pickNextBuilds(builds: string[], buildConfigs: string[]) {
    let currentBuildConfigEntry: any = null
    const promises = []
    let head
    logger.trace(`>pickNextBuilds from ${buildConfigs.length} buildConfigs`)
    while ((currentBuildConfigEntry = buildConfigs.shift()) !== undefined) {
      if (!head) {
        head = currentBuildConfigEntry
      } else if (head === currentBuildConfigEntry) {
        buildConfigs.push(currentBuildConfigEntry)
        break
      }
      const currentBuildConfig = currentBuildConfigEntry.item
      const buildConfigFullName = util.fullName(currentBuildConfig)
      const dependencies = currentBuildConfigEntry.dependencies
      let resolved = true
      for (let i = 0; i < dependencies.length; i += 1) {
        const parentBuildConfigEntry = dependencies[i].buildConfigEntry
        logger.trace(`${buildConfigFullName}  needs ${util.fullName(dependencies[i].item)}`)
        if (parentBuildConfigEntry) {
          logger.trace(`${buildConfigFullName}  needs ${util.fullName(parentBuildConfigEntry.item)}`)
          // var parentBuildConfig = parentBuildConfigEntry.item
          if (!parentBuildConfigEntry.imageStreamImageEntry) {
            const parentBuildEntry = parentBuildConfigEntry.buildEntry
            const buildStatus = this.getBuildStatus(parentBuildEntry)
            if (!buildStatus) {
              resolved = false
              break
            }
          }
        }
      }
      // dependencies have been resolved/satisfied
      if (resolved) {
        logger.trace(`Queuing ${buildConfigFullName}`)
        const _startBuild = this.startBuildIfNeeded.bind(this)
        const _bcCacheEntry = currentBuildConfigEntry

        promises.push(
          Promise.resolve(currentBuildConfig)
          .then(() => {
            return _startBuild(currentBuildConfig)
          })
          .then(build => {
            const _names = build?.identifiers()
            _bcCacheEntry.buildEntry = this._setCache(this.objects(_names))[0]
            if (build) {
              builds.push(..._names)
            }
          }),
        )
        if (head === currentBuildConfigEntry) {
          head = undefined
        }
      } else {
        buildConfigs.push(currentBuildConfigEntry)
        logger.trace(`Delaying ${buildConfigFullName}`)
      }
    } // end while

    let p = Promise.all(promises)
    if (buildConfigs.length > 0) {
      const pickNextBuilds = this.pickNextBuilds.bind(this)
      p = p.then(() => {
        return pickNextBuilds(builds, buildConfigs)
      })
    }
    return p.catch(error => {
      throw error
    })
  }

  async startBuild(resources: any) {
    logger.info('>startBuilds')
    const buildConfigs = this._setCache(this.objects(resources))

    buildConfigs.forEach((entry: any) => {
      const bc = entry.item
      const buildConfigFullName = util.fullName(bc)
      logger.trace(`Analyzing ${buildConfigFullName} - ${bc.metadata.namespace}`)
      const outputTo = bc.spec.output.to
      if (outputTo) {
        if (outputTo.kind === CONSTANTS.KINDS.IMAGE_STREAM_TAG) {
          const name = outputTo.name.split(':')
          const imageStreamFullName = `${outputTo.namespace || bc.metadata.namespace}/${CONSTANTS.KINDS.IMAGE_STREAM}/${name[0]}`
          const imageStreamCacheEntry = this._getCache(imageStreamFullName)[0]
          imageStreamCacheEntry.buildConfigEntry = entry
        } else {
          throw new Error(`Expected '${CONSTANTS.KINDS.IMAGE_STREAM_TAG}' but found '${outputTo.kind}' in ${buildConfigFullName}.spec.output.to`)
        }
      }

      const dependencies: string[] = []

      util.getBuildConfigInputImages(bc).forEach(sourceImage => {
        if (sourceImage.kind === CONSTANTS.KINDS.IMAGE_STREAM_TAG) {
          const name = sourceImage.name.split(':')
          const imageStreamFullName = `${sourceImage.namespace || bc.metadata.namespace}/${CONSTANTS.KINDS.IMAGE_STREAM}/${name[0]}`
          dependencies.push(this._getCache(imageStreamFullName)[0])
        } else {
          throw new Error(`Expected '${CONSTANTS.KINDS.IMAGE_STREAM_TAG}' but found '${sourceImage.kind}' in  ${bc.metadata.kind}/${bc.metadata.name} - ${JSON.stringify(sourceImage)}`)
        }
      })
      entry.dependencies = dependencies
    })

    const builds: any[] = []
    return this.pickNextBuilds(builds, buildConfigs).then(() => {
      return builds
    })
  }

  processDeploymentTemplate(template: string, templateArgs: any) {
    const objects = this.process(template, templateArgs)
    this.applyBestPractices(objects)
    return objects
  }

  processBuidTemplate(template: string, templateArgs: any) {
    const objects = this.process(template, templateArgs)
    this.applyBestPractices(objects)
    return objects
  }

  async applyAndBuild(objects: any) {
    this.fetchSecretsAndConfigMaps(objects)
    const applyResult: OpenShiftStaticSelector = this.apply(objects)

    return applyResult
    .narrow('bc')
    .startBuild()
    .catch((error: Error) => {
      console.log(error.stack)
      // process.exit(1)
      throw new Error(error.stack)
    })
  }

  async applyAndDeploy(resources: any[], appName: string): Promise<string> {
    this.fetchSecretsAndConfigMaps(resources)
    const existingDC = this.raw('get', ['dc'], {
      selector: `app=${appName}`,
      output: 'template={{range .items}}{{.metadata.name}}{{"\\t"}}{{.spec.replicas}}{{"\\t"}}{{.status.latestVersion}}{{"\\n"}}{{end}}',
    })
    //
    this.apply(resources)

    const newDCs = this.raw('get', ['dc'], {
      selector: `app=${appName}`,
      output: 'template={{range .items}}{{.metadata.name}}{{"\\t"}}{{.spec.replicas}}{{"\\t"}}{{.status.latestVersion}}{{"\\n"}}{{end}}',
    })

    const proc = this.rawAsync('get', 'dc', {
      selector: `app=${appName}`,
      watch: 'true',
    })

    return new Promise(resolve => {
      if (existingDC.stdout === newDCs.stdout) {
        proc.kill('SIGTERM')
      } else {
        OpenShiftClientResult.waitForDeployment(proc)
      }
      proc.on('exit', () => {
        return resolve('exit')
      })
    })
  }
}
