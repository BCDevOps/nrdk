'use strict'
import {ENV} from './constants'
import {spawn, SpawnOptions} from 'child_process'
import {GeneralError} from './../error'

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
        reject(new GeneralError({stdout, stderr, exitCode, error: `Error encountered for command! (${args})`}.toString()))
      }
    })
    cp.on('exit', exitCode => {
      if (exitCode === 0) {
        return resolve({stdout, stderr, exitCode})
      }
      reject(new GeneralError({stdout, stderr, exitCode, error: `Error encountered for command! (${args})`}.toString()))
    })
    cp?.stderr?.on('data', data => {
      stderr += data
    })
    cp?.stdout?.on('data', data => {
      stdout += data
    })
  })
} // end childProcess()
