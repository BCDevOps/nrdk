import * as FLAGS from '../../../flags'
import {BaseCommand} from '../../../base'
import {flags} from '@oclif/command'
import {writeFileSync, readFileSync} from 'fs'
import {basename} from 'path'
import {_spawn} from '../../../util/child-process'
import {LoggerFactory} from '../../../util/logger'
const name = 'util:truststore:add'
const logger = LoggerFactory.createLogger(name)

/*
You can achieve the same by
1) Grab Secret, truststore key, decode key, and save into a p12 file
   $ oc --namespace=b24326-dev get secret/cvarjao-wallet-test --output=json  | jq -jr '.data["truststore.p12"]' | base64 --decode  > tmp.p12
2) Import certificate
   $ keytool -import -noprompt -trustcacerts -alias entrust_2048_ca.cer -file entrust_2048_ca.cer -keystore tmp.p12 -storepass <password>
3) Update Secret
   $ base64 --wrap=0 tmp.p12
4) Grab the base64 encoded text and update the Secret/YAML in OpenShift
*/

/**
 * Import a certificate from a file(s) to an existing truststore file stored in an Secret in OpenShift.
 *
 * Prerequisites:
 * - oc
 * - keytool (part of java JDK)
 */
export default class UtilTruststoreAdd extends BaseCommand {
  static description = 'Add a certificate to a p12 truststore to an existing OpenShift Secret'

  static hidden = true

  static flags = {
    namespace: flags.string({char: 'n', description: 'Namespace', required: true}),
    secret: flags.string({char: 's', description: 'Secret name', required: true}),
    key: flags.string({char: 'k', description: 'Secret Key', required: true}),
    password: flags.string({char: 'p', description: 'Truststore password', required: true}),
    [FLAGS.FlagNames.DRY_RUN]: flags.boolean({description: 'Stage truststore changes, but do NOT update secret', default: false}),
  }

  static args = [{name: 'file', description: 'Public certifiate file in PEM format with .crt extension', required: true}]

  static strict = false

  async run() {
    const {flags, argv} = this.parse(UtilTruststoreAdd)
    const ocGetSecret = await _spawn(logger, 'oc', [`--namespace=${flags.namespace}`, 'get', `secret/${flags.secret}`, '--output=json'])
    if (ocGetSecret.status !== 0) {
      return this.error(`oc get secret returned ${ocGetSecret.status}, expected 0.`)
    }
    const truststore = Buffer.from(JSON.parse(ocGetSecret.stdout).data[flags.key as string], 'base64')
    writeFileSync('tmp-truststore.p12', truststore)
    for (const file of argv) {
      this.log(`Importing ${file} ...`)
      // eslint-disable-next-line no-await-in-loop
      const ocKeytoolImport = await _spawn(logger, 'keytool', ['-import', '-noprompt', '-trustcacerts', '-alias ', basename(file) as string, '-file', file, '-keystore', 'tmp-truststore.p12', '-storepass', flags.password as string])
      if (ocKeytoolImport.status !== 0) {
        return this.error(`keytool import returned ${ocKeytoolImport.status}, expected 0.\nstdout:${ocKeytoolImport.stdout}\nstderr:${ocKeytoolImport.stderr}`)
      }
    }
    const patch = {data: {[flags.key as string]: readFileSync('tmp-truststore.p12', {encoding: null}).toString('base64')}}
    if (flags['dry-run'] === true) {
      this.log(`Skipping: Updating secret ${flags.secret} ...`)
    } else {
      this.log(`Updating secret ${flags.secret} ...`)
      const ocPatch = await _spawn(logger, 'oc', [`--namespace=${flags.namespace}`, 'patch', `secret/${flags.secret}`, '-p', JSON.stringify(patch)])
      if (ocPatch.status !== 0) {
        return this.error(`oc patch returned ${ocPatch.status}, expected 0.`)
      }
    }
  }
}
