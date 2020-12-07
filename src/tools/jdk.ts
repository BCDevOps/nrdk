import {Tool} from './tool'
import {MavenHelper} from './maven-helper'
import * as tar from 'tar'
import * as path from 'path'
import {ChildProcess, spawn, SpawnOptions} from 'child_process'
import {LoggerFactory} from '../util/logger'
import * as fs from 'fs'
import { GeneralError } from '../error'

export class Jdk extends Tool {
  static logger = LoggerFactory.createLogger(Jdk)

  version = '8.0.181+13'

  static toJavaClassPath(items: string[]): string {
    if (require('os').platform() === 'win32') {
      return items.join(';')
    }
    return items.join(':')
  }

  async run(args: readonly string[], options: SpawnOptions): Promise<ChildProcess> {
    Jdk.logger.debug(`Running java: ${args.map(v => `'${v}'`).join(' ')}`)
    return this.install(this.version).then(() => spawn('java', args, options))
  }

  getInstallerPackagePlatform(): string {
    const platform = require('os').platform()
    if (platform === 'win32') return 'windows'
    if (platform === 'darwin') return 'mac'
    if (platform === 'linux') return 'linux'
    throw new Error(`Unsupported OS/Platform: ${platform}`)
  }

  getInstallerPackageArch(): string {
    const arch = require('os').arch()
    if (arch === 'x64') return arch
    throw new Error(`Unsupported OS Archiitecture: ${arch}`)
  }

  async install(version: string): Promise<any> {
    const versions = require('./jdk-versions.json')
    const versionInfo = versions[version]
    const homeDirectory = await this.getHomeDirectory('jdk', versionInfo.basename || version)
    return this.exists(homeDirectory).then(async exists => {
      if (exists) return homeDirectory
      const platform = await this.getInstallerPackagePlatform()
      const arch = await this.getInstallerPackageArch()
      const versionOsInfo = versionInfo[`${platform}-${arch}`]
      const url = new URL(versionOsInfo.url as string)
      const cacheFile = path.join(await this.getCacheDirectory('jdk'), path.basename(url.pathname))
      const packageFile = await MavenHelper.downloadFromUrl(url, cacheFile)
      await fs.promises.mkdir(homeDirectory, {recursive: true}).catch(error => {
        if (error.code !== 'EEXIST') {
          throw new GeneralError('Directory already exists', error)
        }
      })
      return tar.x({file: packageFile, C: homeDirectory, strip: 2}).then(() => {
        return homeDirectory
      })
    })
  }
}
