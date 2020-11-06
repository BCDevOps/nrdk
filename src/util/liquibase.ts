/* eslint-disable unicorn/filename-case */
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import * as http from 'http'
import * as https from 'https'
import * as tar from 'tar'
import {spawn, SpawnOptions} from 'child_process'

type FileReference = {path: string; exists: boolean}
type MavenGAV = {groupId: string; artifactId: string; version: string; ext?: string; classifier?: string}

function gavToPath(gav: MavenGAV): string {
  if (gav.classifier) {
    return `${gav.groupId.replace(/\./gi, '/')}/${gav.artifactId}/${gav.version}/${gav.artifactId}-${gav.version}-${gav.classifier}.${gav.ext || 'jar'}`
  }
  return `${gav.groupId.replace(/\./gi, '/')}/${gav.artifactId}/${gav.version}/${gav.artifactId}-${gav.version}.${gav.ext || 'jar'}`
}
function httpGet(url: URL, callback: (res: http.IncomingMessage) => void): http.ClientRequest {
  if (url.protocol === 'https:') {
    return https.get(url, callback)
  }
  return http.get(url, callback)
}
export default class Liquibase {
  remoteMavenRepositoryUrl = 'https://repo1.maven.org/maven2'

  jdbcDrivers: MavenGAV[] = [{groupId: 'com.oracle.database.jdbc', artifactId: 'ojdbc8', version: '18.3.0.0'}]

  liquibase: MavenGAV = {groupId: 'org.liquibase', artifactId: 'liquibase-core', version: '4.1.1', ext: 'tar.gz'}

  async downloadArtifact(gav: MavenGAV) {
    const cacheDir = path.join(os.tmpdir(), '.m2', 'repository')
    const remoteFilePath = gavToPath(gav)
    const localFileName = path.join(cacheDir, remoteFilePath)
    // console.log(localFileName)
    const localFileStat = await fs.promises.stat(localFileName).catch(() => {
      return undefined
    })
    if (localFileStat && localFileStat.size > 0) {
      return localFileName
    }
    fs.mkdirSync(path.dirname(localFileName), {recursive: true})
    const stream = fs.createWriteStream(localFileName)
    const url = new URL(`${this.remoteMavenRepositoryUrl}/${remoteFilePath}`)
    // console.dir(url.protocol)
    return new Promise(resolve => {
      httpGet(url, response => {
        response.pipe(stream)
        response.on('end', () => {
          resolve(localFileName)
        })
      }).on('error', () => {
        fs.unlinkSync(localFileName)
      })
    }) as Promise<string>
  }

  async downloadDrivers() {
    const drivers: Promise<string>[] = []
    for (const jdbcDriverGAV of this.jdbcDrivers) {
      drivers.push(this.downloadArtifact(jdbcDriverGAV))
    }
    return Promise.all(drivers)
  }

  async install() {
    const liquibaseZipFile = path.join(os.tmpdir(), '.liquibase.tar.gz')
    const liquibaseHomeDir = path.join(os.tmpdir(), `.liquibase-${this.liquibase.version}`)
    if (fs.existsSync(path.join(liquibaseHomeDir, 'liquibase.jar'))) {
      return liquibaseHomeDir
    }
    return Promise.resolve(liquibaseZipFile)
    .then(fileName => {
      return new Promise(resolve => {
        // if file exists
        fs.stat(fileName, function (err, stats) {
          resolve({path: fileName, exists: (!err && stats.isFile())} as FileReference)
        })
      }) as Promise<FileReference>
    })
    .then(async file => {
      if (file.exists === true) {
        return file
      }
      const cacheFilePath = await this.downloadArtifact(this.liquibase)
      return {path: cacheFilePath, exists: true} as FileReference
    })
    .then(async file => {
      await fs.promises.mkdir(liquibaseHomeDir).catch(error => {
        if (error.code !== 'EEXIST') {
          throw error
        }
      })
      return tar.x({file: file.path, C: liquibaseHomeDir}).then(() => {
        return liquibaseHomeDir
      })
    })
    .then(homeDir => {
      return this.downloadDrivers().then(() => {
        return homeDir
      })
    })
  }

  async spawn(args: string[], options: SpawnOptions) {
    return this.install().then(liquibaseHomeDir => {
      return this.downloadDrivers().then(drivers => {
        return new Promise(resolve => {
          const _args = [
            '-cp',
            `${liquibaseHomeDir}/liquibase.jar:${liquibaseHomeDir}/lib/:${liquibaseHomeDir}/lib/*:${drivers.join(
              ':'
            )}`,
            'liquibase.integration.commandline.Main',
          ]
          _args.push(...args)
          resolve(spawn('java', _args, {...options}))
        })
      })
    })
  }
}
