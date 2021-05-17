import {Command, flags} from '@oclif/command'
import {Terraform} from '../../tools/terraform'

export default class ToolTerraform extends Command {
  static examples = [
    '$ nrdk tool:terraform -v',
    '$ nrdk tool:terraform -c -- --version',
    '> Terraform v0.15.1',
  ]

  static flags = {
    help: flags.help({char: 'h', description: 'terraform wrapper help'}),
    version: flags.boolean({char: 'v', description: 'terraform version'}),
    command: flags.boolean({char: 'c', description: 'pass commands directly to terraform'}),
  }

  static hidden = true

  static strict = false

  static usage = 'nrdk tool:terraform -c -- [init|validate|plan|apply|destroy]'

  async run() {
    const {argv, flags} = this.parse(ToolTerraform)

    const tf = new Terraform()
    if (flags.version) {
      tf.run(['version'])
    } else if (flags.command) {
      tf.run(argv)
    } else {
      this.log('Please run with the flag --help')
    }
  }
}
