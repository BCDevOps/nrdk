import {Command, flags} from '@oclif/command'
import * as GitFlags from '../git-flags'

interface BuildOnlyFlags {
  'pr':  flags.IOptionFlag<string | undefined>;
  'config-script':  flags.IOptionFlag<string | undefined>;
  'build-script':  flags.IOptionFlag<string | undefined>;
}

type AllBuildFlags=flags.Input<any> & GitFlags.GitFlags & BuildOnlyFlags;

export default class Build extends Command {
  static description = 'describe the command here'

  static flags = {...{pr: flags.integer(), 'config-script': flags.string({hidden: true}), 'build-script': flags.string({hidden: true})}, ...GitFlags.createGitFlags()} as AllBuildFlags

  // static args = [{name: 'file'}]
  async run() {
    const {flags} = this.parse(Build)
    await GitFlags.applyDefaults(flags)
    if (!flags['config.script']) flags['config.script'] = `${process.cwd()}/.pipeline/lib/config.js`
    if (!flags['build.script']) flags['build.script'] = `${process.cwd()}/.pipeline/lib/build.js`
    this.debug(flags)
    const Settings = require(flags['config-script'] as string)
    const task = require(flags['build-script'] as string)
    const settings = new Settings().build()
    task(Object.assign(settings, {phase: 'build'}))
  }
}
