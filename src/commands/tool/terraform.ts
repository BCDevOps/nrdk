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

  static strict = false

  static hidden = true

  static flags = {
    help: flags.help({char: 'h', description: 'terraform wrapper help'}),
    install: flags.boolean({char: 'i', description: 'install terraform'}),
    remove: flags.boolean({char: 'r', description: 'remove terraform'}),
    version: flags.boolean({char: 'v', description: 'terraform version'}),
    command: flags.boolean({char: 'c', description: 'pass commands directly to terraform'}),
  }

  async run() {
    const {flags} = this.parse(ToolTerraform)
    console.log('')

    const tf = new Terraform()
    if (flags.install) {
      tf.install()
    } else if (flags.remove) {
      tf.remove()
    } else if (flags.version) {
      tf.run(['version'])
    } else if (flags.command) {
      tf.run(this.parse(ToolTerraform).argv)
    } else {
      console.log('Please run with the flag --help')
    }
  }
}
