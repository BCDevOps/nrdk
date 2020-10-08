import {Command, flags} from '@oclif/command'
import * as Parser from '@oclif/parser'
import {spawn, SpawnOptions} from 'child_process'
import * as FlagsSpec from './flags'

export abstract class BaseCommand extends Command {
  static createBaseFlags() {
    return {
      [FlagsSpec.FlagNames.CONFIG_SCRIPT]: flags.string({hidden: true}),
      [FlagsSpec.FlagNames.BUILD_SCRIPT]: flags.string({hidden: true}),
    }
  }

  async _spawn(command: string, argsv?: readonly string[], options?: SpawnOptions): Promise<{status: number; stdout: string; stderr: string}> {
    // this.log('%s %s', command, (argsv || []).join(' '))
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

  protected parse<F, A extends {
    [name: string]: any;
}>(options?: Parser.Input<F>, argv?: string[]): Parser.Output<F, A> {
    const output: Parser.Output<F, A> = super.parse(options, argv)
    return output
  }
}
