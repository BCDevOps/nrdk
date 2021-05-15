import {Tool} from './tool'
import * as fs from 'fs'
import * as path from 'path'
import {ChildProcess} from 'child_process'
import {Jdk} from './jdk'
import {GeneralError} from '../error'
import {LoggerFactory} from '../util/logger'
import Axios from 'axios'

export class Terraform extends Tool {
  static logger = LoggerFactory.createLogger(Terraform)

  // Installer
  async install(installer: any): Promise<string> {
    // Version, download url and destination from Installer object
    const version = installer.version
    const url = installer.binary.url
    const dest = installer.binary.dest

    // Binary and temporary zip download
    const bin = path.join(dest, 'terraform')
    const zip = path.join('/tmp', `terraform-${Date.now()}.zip`)

    // Notify and exit if binary already exists
    if (fs.existsSync(bin)) {
      console.log(`${bin} already exists.  Skipping install.`)
      return 'Exists'
    }
    console.log(`Installing Terraform ${version}`)

    // Make install dir (exists != error)
    fs.promises.mkdir(dest, {recursive: true}).catch(error => {
      throw new GeneralError(error)
    })

    // Download file from link
    Axios.get(url, {responseType: 'stream'}).then(response => {
      const stream = fs.createWriteStream(zip)
      response.data.pipe(stream)
      return new Promise((resolve, reject) => {
        stream.on('finish', resolve)
        stream.on('error', reject)
      })
      .catch(error => {
        fs.unlinkSync(zip)
        throw new GeneralError('Download error', error)
      })
      .then(() => {
        // Unzip
        const unzipper = require('unzipper')
        return new Promise((resolve, reject) => {
          fs.createReadStream(zip)
          // eslint-disable-next-line new-cap
          .pipe(unzipper.Extract({path: dest}))
          .on('error', reject)
          .on('finish', () => {
            // Make binary executable
            fs.promises.chmod(bin, 0o775)

            // Remove download
            fs.promises.unlink(zip)
            .catch(error => {
              console.log(error)
              throw new GeneralError('Extract error', error)
            })
            resolve(zip)
          })
        })
      })
    })
    return zip
  }

  // Remover/uninstaller
  async remove(installer: any): Promise<string> {
    const {dest} = installer.binary
    console.log(`Removing ${dest}`)
    if (fs.existsSync(dest)) {
      fs.rmdir(dest, {recursive: true}, error => {
        if (error) {
          throw new GeneralError('Removal error', error)
        }
      })
    } else {
      console.log('Expected terraform install is not present')
    }
    return dest
  }

  // Run stub
  async run(installer: any): Promise<ChildProcess> {
    const {version} = installer
    return this.install(version)
    .then(async () => {
      return new Jdk().run([],  {stdio: ['ignore', 'pipe', 'pipe']})
    })
  }
}
