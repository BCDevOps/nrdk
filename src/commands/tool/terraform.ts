import {Command} from '@oclif/command'
import {Terraform} from '../../tools/terraform'
import {streamOutput} from '../../util/child-process'

export default class ToolTerraform extends Command {
  static hidden = true

  static strict = false

  async run() {
    const {argv} = this.parse(ToolTerraform)
    const tf = new Terraform()
    await tf.run(argv, {stdio: ['ignore',  'pipe', 'pipe']})
    .then(streamOutput(process.stdout, process.stderr))
    .then(proc => proc.status as number)
  }
}
