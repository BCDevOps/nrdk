import {Command, flags} from '@oclif/command'
import {Terraform} from '../../tools/terraform'

export default class ToolTerraform extends Command {
  static description = 'Terraform commands'

  static examples = [
    `
    $ nrdk tool:terraform -v
    $ nrdk tool:terraform -c -- --version
    > Terraform v0.15.1
    `,
  ]

  static flags = {
    help: flags.help({char: 'h', description: 'terraform wrapper help'}),
    version: flags.boolean({char: 'v', description: 'terraform version'}),
    command: flags.boolean({char: 'c', description: 'pass commands directly to terraform'}),
  }

  static hidden = true

  static strict = false

  async run() {
    const {argv, flags} = this.parse(ToolTerraform)

    const tf = new Terraform()
    if (flags.version) {
      tf.run(['version'])
    } else if (flags.command) {
      tf.run(argv)
    } else {
      console.log('Please run with the flag --help')
    }
  }
}
