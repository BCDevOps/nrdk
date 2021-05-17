import {Tool} from './tool'
import * as fs from 'fs'
import * as path from 'path'
import {ChildProcess, spawn, SpawnOptions} from 'child_process'
import {GeneralError} from '../error'
import {LoggerFactory} from '../util/logger'
import Axios from 'axios'

// Terraform install settings
const {bin, dest, url} = require('./terraform/settings.ts')

export class Terraform extends Tool {
  static logger = LoggerFactory.createLogger(Terraform)

  // Installer
  async install(): Promise<string> {
    // Bin destination, source url, bin path and temporary zip download
    const zip = path.join('/tmp', `terraform-${Date.now()}.zip`)

    // Notify and exit if binary already exists
    if (fs.existsSync(bin)) {
      console.log(`\nUsing ${bin}\n`)
      return bin
    }
    console.log(`\nInstalling ${bin}\n`)

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
          .on('finish', async () => {
            // Make binary executable
            await fs.promises.chmod(bin, 0o775)

            // Remove download
            await fs.promises.unlink(zip)
            .catch(error => {
              console.log(error)
              throw new GeneralError('Extract error', error)
            })
            resolve(zip)
          })
        })
      })
    })
    return bin
  }

  // Remover/uninstaller
  async remove(): Promise<string> {
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
    // Default SpawnOptions
    const op = options || {stdio: ['pipe', process.stdout, process.stderr]}

    // Install terraform, if necessary
    return this.install()
    // Then run terraform with provided arguments
    .then(async getBin => {
      return spawn(getBin, args, op)
    })
  }
}
