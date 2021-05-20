import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {ChildProcess, SpawnOptions} from 'child_process'

// Downloader (maven-helper), install settings and utils
import {MavenHelper} from './maven-helper'
import {url, version} from './terraform/settings'
import {_spawn2} from '../util/child-process'
import {LoggerFactory} from '../util/logger'

// Tool abstract
import {Tool} from './tool'

export class Terraform extends Tool {
  static logger = LoggerFactory.createLogger(Terraform)

  // Get full path to binary ().exe appended for Windows)
  bin(homeDir: string): string {
    if (os.platform() === 'win32') return path.join(homeDir, 'terraform.exe')
    return path.join(homeDir, 'terraform')
  }

  // Installer
  async install(): Promise<string> {
    // Install dir, zip download and bin path
    const homeDir = path.join(os.tmpdir(), `.nrdk/terraform/${version}`)
    const zip = path.join(os.tmpdir(), `terraform-${Date.now()}.zip`)
    const bin = this.bin(homeDir)

    // Return if binary already exists
    if (fs.existsSync(bin)) return bin

    // Download from url
    await MavenHelper.downloadFromUrl(new URL(url), zip)

    // Extract
    const extract = (await import('unzipper')).Extract
    return new Promise((resolve, reject) => {
      fs.createReadStream(zip)
      .pipe(extract({path: homeDir}))
      .on('error', reject)
      .on('close', () => resolve(true))
    })
    // Chmod +x (Linux and MacOS only)
    .then(() => {
      if (os.platform() !== 'win32') fs.chmodSync(bin, 0o755)
    })
    // Promise returns path to bin
    .then(() => {
      return bin
    })
  }

  // Run commands using child_process
  async run(args: readonly string[], ops?: SpawnOptions): Promise<ChildProcess> {
    // Install terraform, if necessary
    return this.install()
    // Run terraform in spawn wrapper
    .then(async bin => {
      return _spawn2(bin, args, ops || {})
    })
  }
}
