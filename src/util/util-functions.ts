'use strict'
import {ENV} from './constants'
import {spawn, SpawnOptions} from 'child_process'
import {BasicCustomError} from './custom-error'

export function previousEnv(env: string) {
  const stage: any = {
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

export async function childProcess(...args: [string, string[], SpawnOptions]) {
  // eslint-disable-next-line prefer-spread
  const cp = spawn.apply(null, args)
  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''

    cp.on('error', err => {
      reject(err)
    })

    cp.on('close', exitCode => {
      if (exitCode === 0) {
        resolve({stdout, stderr, exitCode})
      } else {
        // console.error("ChildProcess: " + args + ".\nOn close with non-zero exist code: " + exitCode);
        reject(new BasicCustomError({stdout, stderr, exitCode}, `Error encountered for command! (${args})`))
      }
    })
    cp.on('exit', exitCode => {
      if (exitCode === 0) {
        return resolve({stdout, stderr, exitCode})
      }
      reject(new BasicCustomError({stdout, stderr, exitCode}, `Error encountered for command! (${args})`))
    })
    cp?.stderr?.on('data', data => {
      stderr += data
    })
    cp?.stdout?.on('data', data => {
      stdout += data
    })
  })
} // end childProcess()
