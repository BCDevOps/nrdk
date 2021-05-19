import {Command} from '@oclif/command'
import {runner} from '../../util/runner-tf'

export default class ToolTerraform extends Command {
  static hidden = true

  // Disable strict to accept variable arguments
  static strict = false

  async run() {
    // Args as array
    const {argv} = this.parse(ToolTerraform)

    // Wrap runs to capture 3rd party app output
    return runner(argv)
  }
}
