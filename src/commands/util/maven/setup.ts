import {BaseCommand} from '../../../base'
import {flags} from '@oclif/command'
import {randomBytes} from 'crypto'
import {homedir} from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as inquirer from 'inquirer'
import * as readline from 'readline'

const prompt = inquirer.createPromptModule()

export default class UtilMavenSetup extends BaseCommand {
  static description = 'describe the command here'

  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    password: flags.string({description: 'Master Password (if not provided, a random one is generated)'}),
    // flag with no value (-f, --force)
    force: flags.boolean({char: 'f'}),
  }

  static args = [{name: 'file'}]

  async run() {
    const {flags} = this.parse(UtilMavenSetup)
    flags.password = flags.password || randomBytes(16).toString('hex')
    const settingsSecurityPath = path.resolve(homedir(), '.m2/settings-security.xml')
    if (fs.existsSync(settingsSecurityPath)) {
      this.log('Creating ~/.m2/settings-security.xml')
      const mvnEncryptMasterPassword = await this._spawn('mvn', ['--encrypt-master-password', flags.password])
      if (mvnEncryptMasterPassword.status !== 0) {
        return this.error(`'mvn --encrypt-master-password <redacted>' returned ${mvnEncryptMasterPassword.status}, expected 0.`)
      }
      // mvnEncryptMasterPassword.stdout.trim()
    }
    await prompt([
      {type: 'input', name: 'username', message: 'IDIR Username'},
      {type: 'password', name: 'password', message: 'IDIR password'},
    ])
    .then(async answer => {
      return this._spawn('mvn', ['--encrypt-password', answer.password])
      .then(proc => {
        answer.password = proc.stdout.trim()
        return answer
      })
    })
    .then(answer => {
      return new Promise(resolve => {
        this.log('Creating ~/.m2/settings.xml')
        const settingsTemplaPath = path.resolve(__dirname, 'maven-settings-template.xml')
        const settingsPath = path.resolve(homedir(), '.m2/settings.xml')
        const reader = readline.createInterface({input: fs.createReadStream(settingsTemplaPath)})
        const writer = fs.createWriteStream(settingsPath, {encoding: 'utf8', flags: 'w'})
        reader.on('line', line => {
          const formatted = line.replace(/#{username}/gm, answer.username).replace(/#{password}/gm, answer.password)
          writer.write(formatted, 'utf8')
          writer.write('\n', 'utf8')
        })
        reader.on('close', () => {
          writer.end()
        })
        writer.on('close', () => {
          resolve(answer)
        })
      })
    })
  }
}
