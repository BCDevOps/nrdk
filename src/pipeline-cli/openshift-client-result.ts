import isEmpty from 'lodash.isempty'

export class OpenShiftClientResult {
  client: any

  constructor(client: any) {
    this.client = client
  }

  // parses the string output from an oc get object --watch command
  // this function in particular returns the field names as identified from the initial
  // output from ocp
  static parseGetObjectFields(stdOut: string): string[] {
    const [fieldNames]: string[] = stdOut.split('\n')

    const names: string[] = fieldNames.replace(/ {2,}/g, '|{}|').split('|{}|')

    return names.map(n => {
      return n.toLowerCase().replace(/ +/g, '_')
    })
  }

  // parses the string output from an oc get object --watch command
  // this function in particular returns the data values from subsequent returns from ocp
  static parseGetObjectValues(stdOut: string): string[] {
    const entries: string[] = stdOut
    .trim()
    .replace(/ {2,}/g, '|{}|')
    .split('|{}|')
    return entries
  }

  /**
   * waits for a deployment from the oc get dc --wait command
   * it will kill the process once the desired replicas and current replicas are equal
   * @param {Process} proc the process command that was spawned for oc get blah
   *
   * usage:
   * const proc = self.rawAsync('get', 'dc', {
      selector: `app=${appName}`,
      watch: 'true'
     });

     OpenshiftClientResult.waitForDeployment(proc);
     // proc will kill when replicas match desired amount

     proc.on('exit', () => do something here)
   */
  static waitForDeployment(proc: any): any {
    let deployment: any = {}
    // eslint-disable-next-line no-console
    console.log(`WAITING FOR DEPLOYMENT:
      if a deployment fails, it will not throw. 
      Ensure you are setting appropriate timeouts while using this implementation!
    `)

    proc.stdout.on('data', (data: { toString: () => string }) => {
      let stdOut: string = data.toString()
      if (isEmpty(deployment)) {
        const keys: string[] = OpenShiftClientResult.parseGetObjectFields(stdOut)
        deployment = keys.reduce((obj: any, key: string) => {
          obj[key] = ''
          return obj
        }, {})

        // we need reference to keys to assign deployment values later
        deployment._keys = keys

        // the first stdout instance contains fields and values and so we remove field names now
        // eslint-disable-next-line no-unused-vars
        const [, entries] = stdOut.split('\n')
        stdOut = entries
      }

      const deployData = OpenShiftClientResult.parseGetObjectValues(stdOut)
      deployData.forEach((d, index) => {
        // eslint-disable-next-line no-underscore-dangle
        deployment[deployment._keys[index]] = d
      })

      if (deployment.desired === deployment.current && deployment.desired !== '') {
        proc.kill('SIGTERM')
      }
    })
  }
}
