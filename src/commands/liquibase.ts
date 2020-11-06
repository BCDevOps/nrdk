import {Command} from '@oclif/command'
// const LiquibaseRunner = require.main?.exports.Liquibase as any
import {flags} from '@oclif/command'
import Liquibase from '../util/liquibase'
export default class LiquibaseCommand extends Command {
  static description = 'Run Liquibase'

  static strict = false

  static hidden = true

  static flags = {
    help: flags.string({char: 'h', hidden: true}),
    defaultsFile: flags.string({description: 'Propery file', default: 'deployment.properties'}),
  }

  async run() {
    const {flags, argv} = this.parse(LiquibaseCommand)
    // eslint-disable-next-line no-console
    console.dir(flags)
    const _argv: string[] = []
    if (flags.defaultsFile) {
      _argv.push(`--defaultsFile=${flags.defaultsFile}`)
    }
    if (flags.help) {
      _argv.push('--help')
    }
    _argv.push(...argv)
    // eslint-disable-next-line no-console
    console.dir(_argv)
    const liquibase = new Liquibase()
    return liquibase.spawn(_argv, {cwd: process.cwd(), stdio: ['ignore', process.stdout, process.stderr]})
    .then((child: any) => {
      return new Promise(resolve => {
        child.on('exit', (exitCode: number) => {
          resolve(exitCode)
        })
      })
    })
  }
}
