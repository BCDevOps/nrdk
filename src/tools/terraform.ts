import {Tool} from './tool'
import * as fs from 'fs'
import * as path from 'path'
import {ChildProcess, SpawnOptions} from 'child_process'
import {LoggerFactory} from '../util/logger'
import * as os from 'os'
// import {MavenHelper} from './maven-helper'

// Terraform install settings
import {url, version} from './terraform/settings'
import {_spawn2} from '../util/child-process'
import {MavenHelper} from './maven-helper'

export class Terraform extends Tool {
  static logger = LoggerFactory.createLogger(Terraform)

  bin(homeDir: string): string {
    if (os.platform() === 'win32') return path.join(homeDir, 'terraform.exe')
    return path.join(homeDir, 'terraform')
  }

  // Installer
  async install(): Promise<string> {
    // Bin destination, source url, bin path and temporary zip download
    const zip = path.join(os.tmpdir(), `terraform-${Date.now()}.zip`)
    const homeDir = path.join(os.tmpdir(), `terraform/${version}`)
    const bin = this.bin(homeDir)
    // Notify and exit if binary already exists
    if (fs.existsSync(bin)) {
      // eslint-disable-next-line no-console
      console.log(`\nUsing ${bin}\n`)
      return bin
    }
    // eslint-disable-next-line no-console
    console.log(`\nInstalling terraform at ${homeDir}\n`)
    // Download file from link
    await MavenHelper.downloadFromUrl(new URL(url), zip)
    // extract
    return new Promise((resolve, reject) => {
      const unzipper = require('unzipper')
      fs.createReadStream(zip)
      // eslint-disable-next-line new-cap
      .pipe(unzipper.Extract({path: homeDir}))
      .on('error', reject)
      .on('finish', () => {
        resolve(true)
      })
    })
    .then(() => {
      return bin
    })
  }

  // Run commanbds using child_process
  async run(args: readonly string[], options?: SpawnOptions): Promise<ChildProcess> {
    // Install terraform, if necessary
    return this.install()
    // Then run terraform with provided arguments
    .then(async bin => {
      return _spawn2(bin, args, options || {})
    })
  }
}
