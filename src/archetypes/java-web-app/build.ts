import {BasicBuilder} from '../../util/basic-builder'
import * as path from 'path'

const MyBuilder = class extends BasicBuilder {
  // eslint-disable-next-line no-useless-constructor
  constructor(settings: any) {
    super(settings)
  }

  processTemplates(oc: any) {
    const phase = 'build'
    const phases = this.settings.phases
    const objects = []
    const commonParams = {
      NAME: phases[phase].name,
      SUFFIX: phases[phase].suffix,
      VERSION: phases[phase].tag,
      SOURCE_GIT_URL: oc.git.http_url,
      SOURCE_GIT_REF: oc.git.branch.merge,
    }
    const finalParams = Object.assign(commonParams, this.settings.buildParams)
    objects.push(
      ...oc.processDeploymentTemplate(oc.toFileUrl(path.resolve(__dirname, './openshift/build.yaml')), {
        param: finalParams,
      })
    )
    return objects
  }
}

export default async function (settings: any) {
  await new MyBuilder(settings).build()
}
