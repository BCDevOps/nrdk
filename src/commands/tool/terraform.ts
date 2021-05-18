import {Command, flags} from '@oclif/command'
import {Terraform} from '../../tools/terraform'
import {streamOutput} from '../../util/child-process'

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
      await tf.run(['version'], {stdio: ['ignore',  'pipe', 'pipe']})
      .then(streamOutput(process.stdout, process.stderr))
      .then(proc => {
        this.exit(proc.status as number)
      })
    } else if (flags.command) {
      await tf.run(argv, {stdio: ['ignore',  'pipe', 'pipe']})
      .then(streamOutput(process.stdout, process.stderr))
      .then(proc => {
        this.exit(proc.status as number)
      })
    } else {
      this.error('Please run with the flag --help')
    }
  }
}
