import {Hook} from '@oclif/config'

export const hook: Hook<'init'> = async function (options) {
  if (!(options.id === 'help' || options.id === 'version')) {
    // eslint-disable-next-line no-console
    console.error(`Starting ${options.config.userAgent}`)
  }
}

export default hook
