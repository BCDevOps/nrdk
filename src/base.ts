import {Command, flags} from '@oclif/command'
import * as Parser from '@oclif/parser'
import * as FlagsSpec from './flags'

export abstract class BaseCommand extends Command {
  static createBaseFlags() {
    return {
      [FlagsSpec.FlagNames.CONFIG_SCRIPT]: flags.string({hidden: true}),
      [FlagsSpec.FlagNames.BUILD_SCRIPT]: flags.string({hidden: true}),
    }
  }

  protected parse<F, A extends {
    [name: string]: any;
}>(options?: Parser.Input<F>, argv?: string[]): Parser.Output<F, A> {
    const output: Parser.Output<F, A> = super.parse(options, argv)
    return output
  }
}
