import {Command} from '@oclif/command'
import {Ansible} from '../../tools/ansible'
import {waitForSuccessfulExitCode} from '../../util/child-process'
export default class ToolAnsibleGalaxy extends Command {
  static description = 'describe the command here'

  static hidden = true

  static flags = {}

  static strict = false

  async run() {
    const {argv} = this.parse(ToolAnsibleGalaxy)
    const ansible = new Ansible()
    ansible.ansible_bin_run_command = 'ansible-galaxy'
    return ansible.run(argv, {stdio: ['ignore', process.stdout, process.stderr]}).then(waitForSuccessfulExitCode)
  }
}
