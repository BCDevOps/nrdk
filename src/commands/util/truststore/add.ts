import {BaseCommand} from '../../../base'
import {flags} from '@oclif/command'
import {writeFileSync, readFileSync} from 'fs'
import {basename} from 'path'

export default class UtilTruststoreAdd extends BaseCommand {
  static description = 'describe the command here'

  static hidden = true

  static flags = {
    namespace: flags.string({char: 'n', description: 'Namespace'}),
    secret: flags.string({char: 's', description: 'Secret name'}),
    key: flags.string({char: 'k', description: 'Secret Key'}),
    password: flags.string({char: 'p', description: 'Truststore password'}),
  }

  static args = [{name: 'file'}]

  static strict = false

  async run() {
    const {flags, argv} = this.parse(UtilTruststoreAdd)
    const ocGetSecret = await this._spawn('oc', [`--namespace=${flags.namespace}`, 'get', `secret/${flags.secret}`, '--output=json'])
    if (ocGetSecret.status !== 0) {
      return this.error(`oc get secret returned ${ocGetSecret.status}, expected 0.`)
    }
    const truststore = Buffer.from(JSON.parse(ocGetSecret.stdout).data[flags.key as string], 'base64')
    writeFileSync('tmp-truststore.p12', truststore)
    for (const file of argv) {
      this.log(`Importing ${file} ...`)
      // eslint-disable-next-line no-await-in-loop
      const ocKeytoolImport = await this._spawn('keytool', ['-import', '-noprompt', '-trustcacerts', '-alias ', basename(file, '.crt') as string, '-file', file, '-keystore', 'tmp-truststore.p12', '-storepass', flags.password as string])
      if (ocKeytoolImport.status !== 0) {
        return this.error(`keytool import returned ${ocKeytoolImport.status}, expected 0.\nstdout:${ocKeytoolImport.stdout}\nstderr:${ocKeytoolImport.stderr}`)
      }
    }
    const patch = {data: {[flags.key as string]: readFileSync('tmp-truststore.p12', {encoding: null}).toString('base64')}}
    const ocPatch = await this._spawn('oc', [`--namespace=${flags.namespace}`, 'patch', `secret/${flags.secret}`, '-p', JSON.stringify(patch)])
    if (ocPatch.status !== 0) {
      return this.error(`oc patch returned ${ocPatch.status}, expected 0.`)
    }
  }
}
