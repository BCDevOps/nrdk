import {Command} from '@oclif/command'
import {Ansible} from '../../tools/ansible'
import {waitForSuccessfulExitCode} from '../../util/child-process'
export default class ToolAnsible extends Command {
  static description = 'describe the command here'

  static hidden = true

  static flags = {}

  static strict = false

  async run() {
    const {argv} = this.parse(ToolAnsible)
    const ansible = new Ansible()
    return ansible.run(argv, {stdio: ['ignore', process.stdout, process.stderr]}).then(waitForSuccessfulExitCode)
  }
}
