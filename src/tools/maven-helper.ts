import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import {GeneralError} from '../error'
import Axios from 'axios'

export type MavenGAV = {group: string; name: string; version: string; ext?: string; classifier?: string}

function gavToPath(gav: MavenGAV): string {
  if (gav.classifier) {
    return `${gav.group.replace(/\./gi, '/')}/${gav.name}/${gav.version}/${gav.name}-${gav.version}-${gav.classifier}.${gav.ext || 'jar'}`
  }
  return `${gav.group.replace(/\./gi, '/')}/${gav.name}/${gav.version}/${gav.name}-${gav.version}.${gav.ext || 'jar'}`
}

export class MavenHelper {
  static remoteMavenRepositoryUrl = 'https://repo1.maven.org/maven2'

  static async downloadFromUrl(url: URL, toFile: string): Promise<string> {
    fs.mkdirSync(path.dirname(toFile), {recursive: true})
    const stream = fs.createWriteStream(toFile)
    return Axios.get(url.toString(), {responseType: 'stream'}).then(response => {
      response.data.pipe(stream)
      return new Promise((resolve, reject) => {
        stream.on('finish', resolve)
        stream.on('error', reject)
      })
    })
    .catch(error => {
      fs.unlinkSync(toFile)
      throw new GeneralError('Something went wrong', error)
    })
    .then(() => {
      return toFile
    })
  }

  static async downloadArtifact(gav: MavenGAV) {
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
    return this.downloadFromUrl(new URL(`${this.remoteMavenRepositoryUrl}/${remoteFilePath}`), localFileName)
  }
}
