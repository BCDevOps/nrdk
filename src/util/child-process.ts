import {spawn, SpawnOptions, SpawnSyncReturns} from 'child_process'
import winston from 'winston'

export async function _spawn(logger: winston.Logger, command: string, argsv: readonly string[], options: SpawnOptions): Promise<SpawnSyncReturns<string>> {
  logger.child({group: ['exec', command], args: argsv}).info('%s %s', command, (argsv || []).join(' '))
  return new Promise(resolve => {
    let stdout = ''
    let stderr = ''
    const child = spawn(command, argsv, options)
    if (!child.stdout) throw new Error('Null stdout property!')
    if (!child.stderr) throw new Error('Null stderr property!')
    child.stdout.on('data', data => {
      stdout += data
    })
    child.stderr.on('data', data => {
      stderr += data
    })
    child.on('exit', status => {
      resolve({pid: 0, status: status as number, stdout, stderr, output: (null as unknown) as string[], signal: null})
    })
  })
}

