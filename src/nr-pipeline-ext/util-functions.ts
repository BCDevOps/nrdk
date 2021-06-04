import {spawn} from 'child_process'
import {ENV} from './constants'
import {GeneralError} from './../error'

export function previousEnv(env: string) {
  const stage = {
    [ENV.DLVR]: {
      before: ENV.BUILD,
    },
    [ENV.TEST]: {
      before: ENV.DLVR,
    },
    [ENV.PROD]: {
      before: ENV.TEST,
    },
  }
  return stage[env].before
}

export async function childProcess(cmd: string, args?: string[], object?: any) {
  const cp = spawn(cmd, args, object)
  return new Promise((resolve, reject) => {
    cp.on('error', (error: string) => {
      reject(error)
    })

    let stdout = ''
    let stderr = ''

    cp.on('close', (exitCode: number) => {
      if (exitCode === 0) {
        resolve({stdout, stderr, exitCode})
      } else {
        // console.error("ChildProcess: " + args + ".\nOn close with non-zero exist code: " + exitCode);
        reject(new GeneralError({stdout, stderr, exitCode, error: `Error encountered for command! ${args}`}.toString()))
      }
    })
    cp.on('exit', exitCode => {
      if (exitCode === 0) {
        return resolve({exitCode})
      }
      reject(new GeneralError({stdout, stderr, exitCode, error: `Error encountered for command! ${args}`}.toString()))
    })

    cp.stderr.on('data', (data: string) => {
      stderr += data
    })
    cp.stdout.on('data', (data: string) => {
      stdout += data
    })
  })
} // end childProcess()

module.exports = {childProcess, previousEnv}
