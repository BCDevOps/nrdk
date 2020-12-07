import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {ChildProcess, SpawnOptions} from 'child_process'

export abstract class Tool {
  abstract async run(args: readonly string[], options: SpawnOptions): Promise<ChildProcess>

  abstract async install(version: string): Promise<any>

  public async exists(location: string): Promise<boolean> {
    return new Promise(resolve => {
      fs.stat(location, err => {
        if (err) return resolve(false)
        resolve(true)
      })
    })
  }

  public async isInstalled(tool: string, version: string): Promise<boolean> {
    return this.getHomeDirectory(tool, version)
    .then(homeDirectory => {
      return new Promise((resolve, reject) => {
        fs.stat(homeDirectory, err => {
          if (err) return reject(err)
          resolve(true)
        })
      })
    })
  }

  public async getHomeDirectory(tool: string, version: string): Promise<string> {
    return path.join(os.tmpdir(), '.nrdk', tool, version)
  }

  public async getCacheDirectory(tool: string): Promise<string> {
    return path.join(os.tmpdir(), '.nrdk', 'cache', tool)
  }
}
