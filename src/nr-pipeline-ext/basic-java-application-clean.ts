import {OpenShiftClientX} from '../pipeline-cli/openshift-client-x'

export class BasicJavaApplicationClean {
  settings: any

  constructor(settings: any) {
    this.settings = settings
  }

  clean(): void {
    const settings = this.settings
    const env = settings.options.env.toLowerCase()
    const phases = settings.phases
    const options = settings.options
    const oc = new OpenShiftClientX(Object.assign({namespace: phases.build.namespace}, options))
    const targetPhase = this.getTargetPhases(env)

    for (const t of targetPhase) {
      const phase = phases[t]
      const buildConfigs = oc.get('bc', {
        selector: `app=${phase.instance},env-id=${phase.changeId},!shared,github-repo=${oc.git.repository},github-owner=${oc.git.owner}`,
        namespace: phase.namespace,
      })
      if (buildConfigs) {
        buildConfigs.forEach((bc: any) => {
          if (bc.spec.output.to.kind === 'ImageStreamTag') {
            oc.delete([`ImageStreamTag/${bc.spec.output.to.name}`], {
              'ignore-not-found': 'true',
              wait: 'true',
              namespace: phase.namespace,
            })
          }
        })
      }

      const deploymentConfigs = oc.get('dc', {
        selector: `app=${phase.instance},env-id=${phase.changeId},env-name=${t},!shared,github-repo=${oc.git.repository},github-owner=${oc.git.owner}`,
        namespace: phase.namespace,
      })
      if (deploymentConfigs) {
        deploymentConfigs.forEach((dc: any) => {
          dc.spec.triggers.forEach((trigger: any) => {
            if (
              trigger.type === 'ImageChange' &&
                            trigger.imageChangeParams.from.kind === 'ImageStreamTag'
            ) {
              oc.delete([`ImageStreamTag/${trigger.imageChangeParams.from.name}`], {
                'ignore-not-found': 'true',
                wait: 'true',
                namespace: phase.namespace,
              })
            }
          })
        })
      }

      oc.raw('delete', ['all'], {
        selector: `app=${phase.instance},env-id=${phase.changeId},!shared,github-repo=${oc.git.repository},github-owner=${oc.git.owner}`,
        wait: 'true',
        namespace: phase.namespace,
      })
      oc.raw('delete', ['pvc,Secret,configmap,endpoints,RoleBinding,role,ServiceAccount,Endpoints'], {
        selector: `app=${phase.instance},env-id=${phase.changeId},!shared,github-repo=${oc.git.repository},github-owner=${oc.git.owner}`,
        wait: 'true',
        namespace: phase.namespace,
      })
    }
  } // end clean()

  // /**
  //    * Obtaining the target (phases) to clean up based on passed user argument 'env'.
  //    * @param {string} env user passed argument for environment(s) to be cleaned.
  //    * @returns Array(string) of targeted environments.
  //    */
  getTargetPhases(env: string): string[] {
    const targetPhase = []
    const phases = this.settings.phases
    for (const phase in phases) {
      if (env.match(/^(all|transient)$/) && phases[phase].transient) {
        targetPhase.push(phase)
      } else if (env === phase) {
        targetPhase.push(phase)
        break
      }
    }

    return targetPhase
  } // end getTargetPhases()
} // end class
