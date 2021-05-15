import {Tool} from './tool'
import * as fs from 'fs'
import * as path from 'path'
import {ChildProcess, spawn, SpawnOptions} from 'child_process'
import {GeneralError} from '../error'
import {LoggerFactory} from '../util/logger'
import Axios from 'axios'

// Terraform install settings
const installer = require('./terraform/settings.ts').getInstaller()

export class Terraform extends Tool {
  static logger = LoggerFactory.createLogger(Terraform)

  // Installer
  async install(): Promise<string> {
    // Bin destination, source url, bin path and temporary zip download
    const {dest, url} = installer.binary
    const bin = path.join(dest, 'terraform')
    const zip = path.join('/tmp', `terraform-${Date.now()}.zip`)

    // Notify and exit if binary already exists
    if (fs.existsSync(bin)) {
      console.log(`${bin} already present\n`)
      return 'Exists'
    }
    console.log(`Installing Terraform ${installer.version}`)

    // Make install dir (exists != error)
    await fs.promises.mkdir(dest, {recursive: true}).catch(error => {
      throw new GeneralError(error)
    })

    // Download file from link
    await Axios.get(url, {responseType: 'stream'}).then(response => {
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
  async remove(): Promise<string> {
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

  // Run commanbds using child_process
  async run(args: readonly string[], options?: SpawnOptions): Promise<ChildProcess> {
    // Install terraform, if necessary
    return this.install()
    // Then run terraform with provided arguments
    .then(async () => {
      // Default SpawnOptions
      const op = options || {stdio: ['pipe', process.stdout, process.stderr]}
      return spawn(installer.binary.bin, args, op)
    })
  }
}
