import {Command} from '@oclif/command'
import {runner} from '../../util/runner'

export default class ToolTerraform extends Command {
  static hidden = true

  static strict = false

  async run() {
    const {argv} = this.parse(ToolTerraform)
    return runner(argv)
  }
}
