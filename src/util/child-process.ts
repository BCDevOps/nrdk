import {spawn, SpawnOptions, SpawnSyncReturns, ChildProcess} from 'child_process'
import {Writable} from 'stream'
import winston from 'winston'
import {LoggerFactory} from '../util/logger'

const logger = LoggerFactory.createLogger('child-process')

export async function _spawn(logger: winston.Logger, command: string, argsv: readonly string[], options?: SpawnOptions): Promise<SpawnSyncReturns<string>> {
  logger.child({group: ['exec', command], args: argsv}).debug('%s %s', command, (argsv || []).join(' '))
  return new Promise<SpawnSyncReturns<string>>(resolve => {
    let stdout = ''
    let stderr = ''
    const _options = options || {}
    const child = spawn(command, argsv, _options)
    if (!child.stdout) throw new Error('Null stdout property!')
    if (!child.stderr) throw new Error('Null stderr property!')
    child.stdout.on('data', data => {
      stdout += data
    })
    child.stderr.on('data', data => {
      stderr += data
    })
    child.on('exit', status => {
      resolve({pid: child.pid, status: status as number, stdout, stderr, output: (null as unknown) as string[], signal: null})
    })
  })
}

export async function _spawn2(command: string, argsv: readonly string[], options?: SpawnOptions): Promise<ChildProcess> {
  logger.child({group: ['spawn', command], args: argsv}).debug('%s %s', command, (argsv || []).join(' '))
  return new Promise(resolve => {
    const child = spawn(command, argsv, options || {})
    resolve(child)
  })
}
export async function waitAndBuffer(child: ChildProcess): Promise<SpawnSyncReturns<string>> {
  return new Promise(resolve => {
    let stdout = ''
    let stderr = ''
    if (!child.stdout) throw new Error('Null stdout property!')
    if (!child.stderr) throw new Error('Null stderr property!')
    child.stdout.on('data', data => {
      if (data instanceof Buffer) {
        stdout += data.toString('utf8')
      } else {
        stdout += data
      }
    })
    child.stderr.on('data', data => {
      if (data instanceof Buffer) {
        stderr += data.toString('utf8')
      } else {
        stderr += data
      }
    })
    child.on('exit', status => {
      resolve({pid: 0, status: status as number, stdout, stderr, output: (null as unknown) as string[], signal: null})
    })
  })
}

export async function waitToExit(proc: ChildProcess): Promise<SpawnSyncReturns<string>> {
  return new Promise(resolve => {
    proc.on('exit', status => {
      resolve({pid: 0, status: status as number, stdout: (null as unknown) as string, stderr: (null as unknown) as string, output: (null as unknown) as string[], signal: null})
    })
  })
}
export async function waitForSuccessfulExitCode(proc: ChildProcess) {
  return new Promise<number>((resolve, reject) => {
    proc.on('exit', exitCode => {
      if (exitCode === 0) {
        resolve(exitCode)
      } else {
        reject(new Error(`Error running '${proc.spawnfile}' (${exitCode})`))
      }
    })
  })
}

export function streamOutput(stdout: Writable, stderr: Writable): (child: ChildProcess) => Promise<SpawnSyncReturns<string>> {
  return (child: ChildProcess): Promise<SpawnSyncReturns<string>> => {
    return new Promise<SpawnSyncReturns<string>>(resolve => {
      child.stdout?.on('data', data => {
        stdout.write(data)
      })
      child.stderr?.on('data', data => {
        stderr.write(data)
      })
      child.on('exit', status => {
        resolve({pid: 0, status: status as number, stdout: '', stderr: '', output: (null as unknown) as string[], signal: null})
      })
    })
  }
}
