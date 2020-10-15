import {spawn, SpawnOptions} from 'child_process'
import winston from 'winston'

export async function _spawn(logger: winston.Logger, command: string, argsv?: readonly string[], options?: SpawnOptions): Promise<{status: number; stdout: string; stderr: string}> {
  logger.child({group: ['exec', command], args: argsv}).info('%s %s', command, (argsv || []).join(' '))
  return new Promise(resolve => {
    let stdout = ''
    let stderr = ''
    const child = spawn(command, argsv, options)
    child.stdout.on('data', data => {
      stdout += data
    })
    child.stderr.on('data', data => {
      stderr += data
    })
    child.on('exit', status => {
      resolve({status: status as number, stdout, stderr})
    })
  })
}

