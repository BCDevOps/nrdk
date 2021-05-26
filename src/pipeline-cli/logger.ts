import debug from 'debug'

export function warn(string: string): debug.Debugger {
  return debug(`warn:${string}`)
}

export function info(string: string): debug.Debugger {
  return debug(`info:${string}`)
}

export function trace(string: string): debug.Debugger {
  return debug(`trace:${string}`)
}
