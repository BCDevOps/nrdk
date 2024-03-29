import {Tool} from './tool'
import {MavenHelper} from './maven-helper'
import * as tar from 'tar'
import * as path from 'path'
import {ChildProcess, spawn, SpawnOptions} from 'child_process'
import {LoggerFactory} from '../util/logger'
import * as fs from 'fs'
import {GeneralError} from '../error'

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
    return this.install(this.version)
    .then(home => {
      const cmd = path.join(home, 'bin', 'java')
      Jdk.logger.debug(`Running ${cmd}: ${args.map(v => `'${v}'`).join(' ')}`)
      // options.env = {JAVA_HOME: path.join(home, 'jre')}
      return spawn(cmd, args, options)
    })
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
    const platform = this.getInstallerPackagePlatform()
    let effectiveHomeDir = path.join(homeDirectory, `jdk${versionInfo.basename}`)
    if (platform === 'mac') {
      effectiveHomeDir = path.join(homeDirectory, `jdk${versionInfo.basename}`, 'Contents', 'Home')
    }
    if (fs.existsSync(path.join(effectiveHomeDir, 'bin', 'java')) || fs.existsSync(path.join(effectiveHomeDir, 'bin', 'java.exe'))) {
      return effectiveHomeDir
    }
    const arch = this.getInstallerPackageArch()
    const versionOsInfo = versionInfo[`${platform}-${arch}`]
    if (!versionOsInfo) throw new Error(`Unable to find jdk install information for ${platform}-${arch}`)
    const url = new URL(versionOsInfo.url as string)
    const cacheFile = path.join(await this.getCacheDirectory('jdk'), path.basename(url.pathname))
    if (!fs.existsSync(cacheFile)) {
      await MavenHelper.downloadFromUrl(url, cacheFile)
    }
    // cleanup if there is any failed/interrupted attempt
    if (fs.existsSync(homeDirectory)) {
      fs.rmdirSync(homeDirectory, {recursive: true})
    }
    await fs.promises.mkdir(homeDirectory, {recursive: true}).catch(error => {
      if (error.code !== 'EEXIST') {
        throw new GeneralError('Directory already exists', error)
      }
    })
    if (cacheFile.endsWith('.zip')) {
      return new Promise((resolve, reject) => {
        const unzipper = require('unzipper')
        fs.createReadStream(cacheFile)
        // eslint-disable-next-line new-cap
        .pipe(unzipper.Extract({path: homeDirectory}))
        .on('error', reject)
        .on('finish', () => {
          resolve(effectiveHomeDir)
        })
      })
    }
    return tar.x({file: cacheFile, cwd: homeDirectory}).then(() => {
      return effectiveHomeDir
    })
    .catch(error => {
      Jdk.logger.error(error)
      return error
    })
  }
}
