/* eslint-disable valid-jsdoc */
import {FlagNames} from '../flags'

import {OpenShiftClientX} from '../pipeline-cli/openshift-client-x'

export class BasicDeployer {
  settings: any

  constructor(settings: any) {
    this.settings = settings
  }

  /**
    *  @returns any[] an array on openshift resources
  **/
  processTemplates(_oc: any): any[] {
    return []
  }

  async deploy() {
    if (this.settings.options[FlagNames.RFC_VALIDATION] === true) {
      //
    }
    await this.deployOpenshift()
  }

  async deployOpenshift() {
    const settings = this.settings
    const phases = settings.phases
    const options = settings.options
    const phase = settings.options.env
    const changeId = phases[phase].changeId
    const oc = new OpenShiftClientX(Object.assign({namespace: phases[phase].namespace}, options))
    const objects = this.processTemplates(oc)
    for (const resource of objects) {
      if (resource.kind === 'Secret') {
        if (resource?.metadata?.annotations['as-copy-of'] && resource.metadata?.annotations?.['create-template'] === 'true') {
          const template = JSON.parse(JSON.stringify(resource))
          template.metadata.name = resource.metadata.annotations['as-copy-of']
          template.metadata.annotations = {}
          template.metadata.labels = {template: 'true', generated: 'true'}
          oc.createIfMissing([template])
        }
      }
    }
    oc.applyRecommendedLabels(objects, phases[phase].name, phase, `${changeId}`, phases[phase].instance)
    oc.importImageStreams(objects, phases[phase].tag, phases.build.namespace, phases.build.tag)
    return oc.applyAndDeploy(objects, phases[phase].instance)
  }
}
