import {Command, flags} from '@oclif/command'
import {Terraform} from '../../tools/terraform'

export default class ToolTerraform extends Command {
  static description = 'Terraform commands'

  static examples = [
    `
    $ nrdk tool:terraform --version
    > Terraform v0.15.1
    `,
  ]

  static hidden = true

  static flags = {
    help: flags.help({char: 'h', description: 'Terraform wrapper help'}),
    install: flags.boolean({char: 'i', description: 'Install terraform'}),
    remove: flags.boolean({char: 'r', description: 'Remove terraform'}),
    version: flags.boolean({char: 'v', description: 'Terraform version'}),
    init: flags.boolean({description: 'Prepare your working directory for other commands'}),
    validate: flags.boolean({description: 'Check whether the configuration is valid'}),
    plan: flags.boolean({description: 'Show changes required by the current configuration'}),
    apply: flags.boolean({description: 'Create or update infrastructure'}),
    destroy: flags.boolean({description: 'Destroy previously-created infrastructure'}),
  }

  static strict = false

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
    } else if (flags.apply) {
      tf.run(['apply'])
    } else if (flags.destroy) {
      tf.run(['destroy'])
    } else if (flags.init) {
      tf.run(['init'])
    } else if (flags.plan) {
      tf.run(['plan'])
    } else if (flags.validate) {
      tf.run(['validate'])
    } else {
      console.log('Please run with the flag --help')
    }
  }
}
