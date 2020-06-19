import {Command, flags} from '@oclif/command'
import * as GitFlags from '../git-flags'

interface CommandFlags {
  'pr':  flags.IOptionFlag<string | undefined>;
  'env':  flags.IOptionFlag<string | undefined>;
}

type Flags=flags.Input<any> & GitFlags.GitFlags & CommandFlags;

export default class Clean extends Command {
  static description = 'describe the command here'

  static flags = {...{pr: flags.integer(), env: flags.string()}, ...GitFlags.createGitFlags()} as Flags

  // static args = [{name: 'file'}]
  async run() {
    const {flags} = this.parse(Clean)
    await GitFlags.applyDefaults(flags)
    this.debug(flags)
    const Config = require(`${process.cwd()}/.pipeline/lib/config.js`)
    const task = require(`${process.cwd()}/.pipeline/lib/clean.js`)
    const settings = new Config().build()
    task(Object.assign(settings, {phase: settings.options.env}))
  }
}
