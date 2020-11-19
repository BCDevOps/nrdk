import {Command} from '@oclif/command'
// const LiquibaseRunner = require.main?.exports.Liquibase as any
import {flags} from '@oclif/command'
import Liquibase from '../util/liquibase'
import * as fs from 'fs'

export default class LiquibaseCommand extends Command {
  static description = 'Run Liquibase'

  static strict = false

  static hidden = true

  static flags = {
    defaultsFile: flags.string({description: 'Propery file', default: 'deployment.properties'}),
  }

  async run() {
    const {flags, argv} = this.parse(LiquibaseCommand)
    // eslint-disable-next-line no-console
    console.dir(flags)
    const _argv: string[] = []
    if (flags.defaultsFile) {
      if (!fs.existsSync(flags.defaultsFile)) {
        return this.error(`Create liquibase properties files called '${flags.defaultsFile}`)
      }
      _argv.push(`--defaultsFile=${flags.defaultsFile}`)
    }
    if (argv[0] === 'help') {
      _argv.push('--help')
      argv.shift()
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
