import {Command, flags} from '@oclif/command'
import * as fs from 'fs'

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

    if (flags.install) {
      console.log('TODO: install terraform')
    } else if (flags.remove) {
      console.log('TODO: remove terraform')
    } else if (flags.settings) {
      console.log('settings.js:')
      console.log(fs.readFileSync('./src/tools/terraform/settings.js', 'utf8'))
    } else if (flags.version) {
      const {data} = require('node-cmd').runSync('terraform version')
      console.log(data)
    } else {
      console.log('Please run with the flag --help')
    }
  }
}
