import {Command, flags} from '@oclif/command'
import {Terraform} from '../../tools/terraform'

// Terraform install settings
const settings = require('../../tools/terraform/settings.ts')

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
    help: flags.help({char: 'h'}),
    install: flags.boolean({char: 'i', description: 'install terraform'}),
    remove: flags.boolean({char: 'r', description: 'remove terraform'}),
    settings: flags.boolean({char: 's', description: 'view settings.js'}),
    version: flags.boolean({char: 'v', description: 'terraform version'}),
  }

  static strict = false

  async run() {
    const {flags} = this.parse(ToolTerraform)
    console.log('')

    // Installer object contains name, platform, version and binary path
    const installer: Record<string, any> = settings.getInstaller()
    const tf = new Terraform()
    if (flags.install) {
      tf.install(installer)
    } else if (flags.remove) {
      tf.remove(installer)
    } else if (flags.settings) {
      console.log('settings:', settings)
    } else if (flags.version) {
      tf.run(['-v'], {stdio: ['pipe', process.stdout, process.stderr]})
    } else {
      console.log('Please run with the flag --help')
    }
  }
}
