/**
 * A module that offers a thin wrapper over `oc` command
 * @module oc-helper
 */
import * as path from 'path'
import * as fs from 'fs'
import * as logger from './logger'
import {CONSTANTS} from './constants'
import {Util as util} from './util'

export class Transformers {
  client: any

  constructor(client: any) {
    this.client = client
  }

  ENSURE_METADATA(resource: any): any {
    resource.metadata = resource.metadata || {}
    resource.metadata.labels = resource.metadata.labels || {}
    resource.metadata.annotations = resource.metadata.annotations || {}

    if (resource.kind === CONSTANTS.KINDS.BUILD_CONFIG) {
      resource.status = resource.status || {}
      resource.status.lastVersion = resource.status.lastVersion || 0
    }
  }

  ENSURE_METADATA_NAMESPACE(resource: any, container: any): any {
    resource.metadata.namespace = resource.metadata.namespace || container.namespace || this.client.namespace()
  }

  ADD_CHECKSUM_LABEL(resource: any): any {
    resource.metadata.labels[CONSTANTS.LABELS.TEMPLATE_HASH] = util.hashObject(resource)
  }

  REMOVE_BUILD_CONFIG_TRIGGERS(resource: any): any {
    if (resource.kind === CONSTANTS.KINDS.BUILD_CONFIG) {
      if (resource.spec.triggers && resource.spec.triggers.length > 0) {
        logger.warn(`'${resource.kind}/${resource.metadata.name}' .spec.triggers are being removed and will be managed by this build script`)
      }
      resource.spec.triggers = []
    }
  }

  ADD_SOURCE_HASH(resource: any): any {
    if (resource.kind === CONSTANTS.KINDS.BUILD_CONFIG) {
      const contextDir = resource?.spec?.source?.contextDir || ''
      let sourceHash = null
      if (resource.spec.source.type === 'Git') {
        let branchName = 'HEAD'
        let revParseRef = `${branchName}:${contextDir}`
        let repositoryDir = this.client.cwd()

        // if it is referencing a repository that is not the current one, clone it to temporary location
        logger.info(`source.git.uri = '${resource.spec.source.git.uri}' git.uri = '${this.client.git.uri}'`)
        if (resource.spec.source.git.uri !== this.client.git.http_url) {
          branchName = resource.spec.source.git.ref || 'master'
          repositoryDir = `/tmp/${util.hashString(resource.spec.source.git.uri)}`
          revParseRef = `${branchName}:${contextDir}`

          if (fs.existsSync(repositoryDir)) {
            util.execSync('git', ['clean', '-fd'], {cwd: repositoryDir})
            util.execSync('git', ['fetch', '--depth', '1', '--no-tags', '--update-shallow', 'origin', `${branchName}`], {cwd: repositoryDir})
            util.execSync('git', ['checkout', `${branchName}`], {cwd: repositoryDir})
          } else {
            util.execSync('git', ['init', '-q', `${repositoryDir}`], {cwd: '/tmp', encoding: 'utf-8'})
            util.execSync('git', ['remote', 'add', 'origin', resource.spec.source.git.uri], {cwd: repositoryDir, encoding: 'utf-8'})
            util.execSync('git', ['fetch', '--depth', '1', '--no-tags', '--update-shallow', 'origin', `${branchName}:${branchName}`], {cwd: repositoryDir, encoding: 'utf-8'})
            util.execSync('git', ['checkout', `${branchName}`], {cwd: repositoryDir})
          }
        }
        // git tree-hash is more stable than commit-hash
        const gitRevParseResult = util.execSync('git', ['rev-parse', revParseRef], {cwd: repositoryDir, encoding: 'utf-8'})
        sourceHash = gitRevParseResult.stdout.toString().trim()
      } else if (resource.spec.source.type === 'Binary') {
        const rootWorkDir = util.execSync('git', ['rev-parse', '--show-toplevel'], {cwd: this.client.cwd()}).stdout.toString().trim()
        const absoluteContextDir = path.join(rootWorkDir, contextDir)
        logger.trace(`contextDir:${contextDir} \t absoluteContextDir:${absoluteContextDir}`)
        const hashes: any[] = []

        // find . -type f -exec git hash-object -t blob --no-filters '{}' \;
        const walk = (start: string, basedir: string) => {
          const stat = fs.statSync(start)
          if (stat.isDirectory()) {
            const files = fs.readdirSync(start)
            files.forEach(name => {
              walk(path.join(start, name), basedir)
            })
          } else {
            const hash = util.execSync('git', ['hash-object', '-t', 'blob', '--no-filters', start], {cwd: this.client.cwd()}).stdout.toString().trim()
            hashes.push({name: start.substr(basedir.length + 1), hash})
          }
        }

        // collect hash of all files
        walk(absoluteContextDir, absoluteContextDir)
        // sort array to remove any OS/FS specific ordering
        hashes.sort((a, b) => {
          if (a.name < b.name) {
            return -1
          }
          if (a.name > b.name) {
            return 1
          }
          return 0
        })
        sourceHash = util.hashObject(hashes)
      } else if (
        resource.spec.source.type === 'Dockerfile' && resource.spec.strategy.type === 'Docker'
      ) {
        sourceHash = util.hashObject(resource.spec.source)
      } else {
        throw new Error('Not Implemented')
      }

      resource.metadata.labels[CONSTANTS.LABELS.SOURCE_HASH] = sourceHash
    }
  }
}
