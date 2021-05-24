'use strict'

import debug from 'debug'

export function logger(name: string): any {
  return {
    warn: debug(`info:${name}`),
    info: debug(`info:${name}`),
    trace: debug(`trace:${name}`),
  }
}
