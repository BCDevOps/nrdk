import {Command} from '@oclif/command'
import {SpawnSyncReturns} from 'child_process'
import {_spawn} from '../../../util/child-process'
import {LoggerFactory} from '../../../util/logger'
const name = 'util:oc:rsync-pvc'
const fqc = `npx @bcgov/nrdk ${name}`
const logger = LoggerFactory.createLogger(name)
const uriRegex = /^(?<serverUrl>[^:]+:\/\/(?<servarNameAndPort>[^:]+:[^/]+))\/namespaces\/(?<namespace>[^/]+)\/(?<kind>[^/]+)\/(?<name>[^/]+)$/

function mustBeSuccessful(arg: SpawnSyncReturns<string>) {
  if (arg.status !== 0) throw new Error(`Processs ${arg.pid} exited with value ${arg.status}\nstdout:${arg.stdout}\nstderr:${arg.stderr}`)
  return arg
}

function print(arg: SpawnSyncReturns<string>) {
  // eslint-disable-next-line no-console
  console.log(`stdout:${arg.stdout}`)
  // eslint-disable-next-line no-console
  console.log(`stderr:${arg.stderr}`)
  return arg
}

export default class UtilOcRsyncPvc extends Command {
  static description = 'describe the command here'

  static hidden = true

  static examples = [
    `$ ${fqc} https://console.pathfinder.gov.bc.ca:8443/namespaces/wp9gel-test/persistentvolumeclaims/wiof-test-app-data-vol2 https://api.silver.devops.gov.bc.ca:6443/namespaces/b24326-test/persistentvolumeclaims/wiof-test-app-data-vol2`,
    `$ ${fqc} wp9gel-test/persistentvolumeclaims/wiof-test-app-data-vol2 b24326-test/persistentvolumeclaims/wiof-test-app-data-vol2`,
  ]

  static flags = {}

  static args = [{name: 'source'}, {name: 'destination'}]

  async run() {
    // eslint-disable-next-line no-console
    console.dir({name: this.config.name, bin: this.config.bin, debug: this.config.debug})
    const {args} = this.parse(UtilOcRsyncPvc)
    const source = args.source.match(uriRegex).groups
    const destination = args.destination.match(uriRegex).groups
    const podOverrides = (pvcName: string) => {
      return {
        spec: {
          enableServiceLinks: false,
          automountServiceAccountToken: false,
          containers: [
            {
              command: [
                '/bin/bash',
                '-c',
                'sleep 5000',
              ],
              image: 'registry.redhat.io/openshift4/ose-cli:latest',
              name: 'rsync-container',
              env: [
                {name: 'HOME', value: '/tmp'},
              ],
              volumeMounts: [{
                mountPath: '/pvc',
                name: 'source-pvc',
              }],
            },
          ],
          volumes: [
            {
              name: 'source-pvc',
              persistentVolumeClaim: {
                claimName: pvcName,
              },
            },
          ],
        },
      }
    }

    try {
      const config: any = await _spawn(logger, 'oc', ['config', 'view', '--output=json'])
      .then(({stdout}) => {
        return JSON.parse(stdout)
      })
      source.cluster = config.clusters.find((item: any) => item.cluster.server === source.serverUrl)
      source.context = config.contexts.find((item: any) => item.context.cluster === source.cluster.name)
      source.context.user = config.users.find((item: any) => item.name === source.context.context.user)

      destination.cluster = config.clusters.find((item: any) => item.cluster.server === destination.serverUrl)
      destination.context = config.contexts.find((item: any) => item.context.cluster === destination.cluster.name)
      destination.context.user = config.users.find((item: any) => item.name === destination.context.context.user)

      await _spawn(logger, 'oc', [`--context=${source.context.name}`, 'whoami'])
      .then(mustBeSuccessful)
      .catch(() => {
        throw new Error(`Please login to '${source.cluster.cluster.server}'`)
      })
      await _spawn(logger, 'oc', [`--context=${destination.context.name}`, 'whoami']).then(mustBeSuccessful)
      .then(mustBeSuccessful)
      .catch(() => {
        throw new Error(`Please login to '${destination.cluster.cluster.server}'`)
      })

      await _spawn(logger, 'oc', [`--context=${source.context.name}`, `--namespace=${source.namespace}`, 'delete', 'pod/rsync-container-src', '--now=true', '--wait=true'])
      await _spawn(logger, 'oc', [`--context=${source.context.name}`, `--namespace=${source.namespace}`, 'run', 'rsync-container-src', `--overrides=${JSON.stringify(podOverrides(source.name))}`, '--image=notused', '--restart=Never'])
      .then(mustBeSuccessful)
      await _spawn(logger, 'oc', [`--context=${source.context.name}`, `--namespace=${source.namespace}`, 'wait', '--timeout=300s', '--for=condition=Ready', 'pod/rsync-container-src'])
      .then(mustBeSuccessful)
      this.log(`Logging into ${destination.cluster.cluster.server}`)
      await _spawn(logger, 'oc', [`--context=${source.context.name}`, `--namespace=${source.namespace}`, 'rsh', 'pod/rsync-container-src', 'oc', 'login', `--server=${destination.cluster.cluster.server}`, `--token=${destination.context.user.user.token}`])
      .then(mustBeSuccessful)

      await _spawn(logger, 'oc', [`--context=${destination.context.name}`, `--namespace=${destination.namespace}`, 'delete', 'pod/rsync-container-dst', '--now=true', '--wait=true'])
      await _spawn(logger, 'oc', [`--context=${destination.context.name}`, `--namespace=${destination.namespace}`, 'run', 'rsync-container-dst', `--overrides=${JSON.stringify(podOverrides(destination.name))}`, '--image=notused', '--restart=Never'])
      .then(mustBeSuccessful)
      await _spawn(logger, 'oc', [`--context=${destination.context.name}`, `--namespace=${destination.namespace}`, 'wait', '--timeout=300s', '--for=condition=Ready', 'pod/rsync-container-dst'])
      .then(mustBeSuccessful)

      // fix permissions
      await _spawn(logger, 'oc', [`--context=${source.context.name}`, `--namespace=${source.namespace}`, 'rsh', 'pod/rsync-container-src', 'chmod', '-R', 'ug+rw', '/pvc'])
      .then(print)
      await _spawn(logger, 'oc', [`--context=${source.context.name}`, `--namespace=${source.namespace}`, 'rsh', 'pod/rsync-container-src', 'oc', `--namespace=${destination.namespace}`, 'rsync', '/pvc/', 'rsync-container-dst:/pvc', '--no-perms=true']).then(mustBeSuccessful)
      .then(print)
      await _spawn(logger, 'oc', [`--context=${destination.context.name}`, `--namespace=${destination.namespace}`, 'rsh', 'pod/rsync-container-dst', 'chmod', '-R', 'ug+rw', '/pvc'])
      .then(print)

      await _spawn(logger, 'oc', [`--context=${source.context.name}`, `--namespace=${source.namespace}`, 'delete', 'pod/rsync-container-src', '--now=true', '--wait=true'])
      await _spawn(logger, 'oc', [`--context=${destination.context.name}`, `--namespace=${destination.namespace}`, 'delete', 'pod/rsync-container-dst', '--now=true', '--wait=true'])
    } catch (error) {
      this.error(error)
    }
  }
}
