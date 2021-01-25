import {Command, flags} from '@oclif/command'
import {Maven} from '../../tools/maven'
import { waitForSuccessfulExitCode } from '../../util/child-process'
export default class ToolMvn extends Command {
  static description = 'describe the command here'

  static hidden = true

  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    name: flags.string({char: 'n', description: 'name to print'}),
    // flag with no value (-f, --force)
    force: flags.boolean({char: 'f'}),
  }

  static strict = false

  static args = [{name: 'file'}]

  async run() {
    const {argv} = this.parse(ToolMvn)
    const mvn = new Maven()
    return mvn.run(argv, {stdio: ['ignore', process.stdout, process.stderr]}).then(waitForSuccessfulExitCode)
  }
}
