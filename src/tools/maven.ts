import {Tool} from './tool'
import {MavenHelper} from './maven-helper'
import * as tar from 'tar'
import * as fs from 'fs'
import * as path from 'path'
import {ChildProcess, SpawnOptions} from 'child_process'
import {Jdk} from './jdk'
import {GeneralError} from '../error'
import {LoggerFactory} from '../util/logger'

export class Maven extends Tool {
  static logger = LoggerFactory.createLogger(Maven)

  async install(version: string): Promise<string> {
    const homeDirectory = await this.getHomeDirectory('maven', version)
    return this.exists(homeDirectory).then(async exists => {
      if (exists === true) return homeDirectory
      const mavenPackage = await MavenHelper.downloadArtifact({group: 'org.apache.maven', name: 'apache-maven', version: version, classifier: 'bin', ext: 'tar.gz'})
      Maven.logger.debug(`Maven downloaded to ${mavenPackage}`)
      await fs.promises.mkdir(homeDirectory, {recursive: true}).catch(error => {
        if (error.code !== 'EEXIST') {
          throw new GeneralError('Directory already exiists', error)
        }
      })
      Maven.logger.debug(`Installing maven to ${homeDirectory}`)
      return tar.x({file: mavenPackage, C: homeDirectory, strip: 1}).then(() => {
        return homeDirectory
      })
    })
  }

  async run(args: readonly string[], options?: SpawnOptions): Promise<ChildProcess> {
    return this.install('3.6.3')
    .then(mavenHome => {
      Maven.logger.debug(`Running maven from ${mavenHome}`)
      return new Jdk().run([
        '-classpath',
        Jdk.toJavaClassPath([path.join(mavenHome, 'boot', '*')]),
        `-Dclassworlds.conf=${mavenHome}/bin/m2.conf`,
        `-Dmaven.home=${mavenHome}`,
        `-Dlibrary.jansi.path=${mavenHome}/lib/jansi-native`,
        `-Dmaven.multiModuleProjectDirectory=${process.cwd()}`,
        'org.codehaus.plexus.classworlds.launcher.Launcher',
        ...args,
      ], options || {})
    })
  }
}
