import {Tool} from './tool'
import {MavenHelper} from './maven-helper'
import * as tar from 'tar'
import * as fs from 'fs'
import * as path from 'path'
import {ChildProcess, SpawnOptions} from 'child_process'
import {Jdk} from './jdk'
import {GeneralError} from '../error'
import {LoggerFactory} from '../util/logger'
import {SecretManager, SVC_IDIR_SPEC} from '../api/service/secret-manager'
import {waitAndBuffer} from '../util/child-process'
import * as readline from 'readline'
// Do some more digging on how to write a script that takes password from stdin as opossed to command argument
// https://github.com/apache/maven/blob/538de4d1924ef982df12d32da394e375561a6e19/maven-embedder/src/main/java/org/apache/maven/cli/MavenCli.java#L889
// https://github.com/jelmerk/maven-settings-decoder/blob/master/src/main/java/org/github/jelmerk/maven/settings/Decoder.java
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
    .then(async mavenHome => {
      Maven.logger.debug(`Running maven from ${mavenHome}`)
      const entry = await (await SecretManager.getInstance()).getEntry(SVC_IDIR_SPEC)
      const idirUsername = (await entry.getProperty(SVC_IDIR_SPEC.fields.UPN.name)).getPlainText()
      const idirPassword = (await entry.getProperty(SVC_IDIR_SPEC.fields.PASSWORD.name))
      const crypto = require('crypto')
      const masterPassword = crypto.randomBytes(16).toString('hex')
      const userConfDir = path.join(mavenHome, 'usr')
      const userSecuritySettingsXmlFile = path.join(userConfDir, 'security-settings.xml')
      const userSettingsXmlFile = path.join(userConfDir, 'settings.xml')

      // Create a random master password and save it in a maven security settings file
      return new Jdk().run([
        '-classpath',
        Jdk.toJavaClassPath([path.join(mavenHome, 'boot', '*')]),
        `-Dclassworlds.conf=${mavenHome}/bin/m2.conf`,
        `-Dmaven.home=${mavenHome}`,
        `-Dlibrary.jansi.path=${mavenHome}/lib/jansi-native`,
        `-Dmaven.multiModuleProjectDirectory=${process.cwd()}`,
        'org.codehaus.plexus.classworlds.launcher.Launcher',
        '--encrypt-master-password',
        masterPassword, // argh! this is ugly and unsecure :( it needs a better way
      ],  {stdio: ['ignore', 'pipe', 'pipe']})
      .then(waitAndBuffer)
      .then(proc => {
        if (!fs.existsSync(userConfDir)) {
          fs.mkdirSync(userConfDir)
        }
        fs.writeFileSync(userSecuritySettingsXmlFile, `<settingsSecurity><master>${proc.stdout.trim()}</master></settingsSecurity>`)
      })
      .then(() => {
        // Encrypt the IDIR password using the generated master password, and then replace username tokens with values, and password token with an encrypted value
        return new Jdk().run([
          '-classpath',
          Jdk.toJavaClassPath([path.join(mavenHome, 'boot', '*')]),
          `-Dclassworlds.conf=${mavenHome}/bin/m2.conf`,
          `-Dmaven.home=${mavenHome}`,
          `-Dlibrary.jansi.path=${mavenHome}/lib/jansi-native`,
          `-Dmaven.multiModuleProjectDirectory=${process.cwd()}`,
          `-Dsettings.security=${userSecuritySettingsXmlFile}`,
          'org.codehaus.plexus.classworlds.launcher.Launcher',
          '--encrypt-password',
          idirPassword.getPlainText(), // argh! this is ugly and unsecure :( it needs a better way
        ],  {stdio: ['ignore', 'pipe', 'pipe']})
        .then(waitAndBuffer)
        .then(proc => {
          if (!fs.existsSync(userConfDir)) {
            fs.mkdirSync(userConfDir)
          }
          const regexIdirUsername = /#{IDIR_USERNAME}/gm
          const regexIdirPassword = /#{IDIR_PASSWORD}/gm
          const readInterface = readline.createInterface({
            input: fs.createReadStream(path.join(__dirname, 'maven', 'settings.xml'), {autoClose: true}),
            terminal: false,
          })
          if (fs.existsSync(userSettingsXmlFile)) {
            fs.unlinkSync(userSettingsXmlFile)
          }
          readInterface.on('line', (line: any) => {
            const result = (line as string).replace(regexIdirUsername, idirUsername).replace(regexIdirPassword, proc.stdout.trim())
            fs.writeFileSync(userSettingsXmlFile, result + '\n', {encoding: 'utf8', flag: 'a'})
          })
          return new Promise(resolve => {
            readInterface.on('close', () => {
              resolve(true)
            })
          })
        })
      })
      .then(() => {
        // Finally, runs the maven command with the generated security settings, and settings files
        return new Jdk().run([
          '-classpath',
          Jdk.toJavaClassPath([path.join(mavenHome, 'boot', '*')]),
          `-Dclassworlds.conf=${mavenHome}/bin/m2.conf`,
          `-Dmaven.home=${mavenHome}`,
          `-Dlibrary.jansi.path=${mavenHome}/lib/jansi-native`,
          `-Dmaven.multiModuleProjectDirectory=${process.cwd()}`,
          `-Dsettings.security=${userSecuritySettingsXmlFile}`,
          'org.codehaus.plexus.classworlds.launcher.Launcher',
          '--settings',
          userSettingsXmlFile,
          ...args,
        ], options || {})
      })
      .then(proc => {
        // when the process ends, delete the files. Even though they are encryoted, best to not leave them around
        proc.on('close', () => {
          if (fs.existsSync(userSecuritySettingsXmlFile)) {
            fs.unlinkSync(userSecuritySettingsXmlFile)
          }
          if (fs.existsSync(userSettingsXmlFile)) {
            fs.unlinkSync(userSettingsXmlFile)
          }
        })
        return proc
      })
    })
  }
}
