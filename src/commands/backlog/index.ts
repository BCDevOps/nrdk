import {Command} from '@oclif/command'

export default class BacklogIndex extends Command {
  static description = 'Manage backlog items and the work related to those items.'

  static hidden = true

  async run() {
    this.error('Use one of the sub-commands')
  }
}
