import {BasicJavaApplicationDeployer} from '../../util/basic-java-application-deployer'
const path = require('path')

const MyDeployer = class extends BasicJavaApplicationDeployer {
  // eslint-disable-next-line no-useless-constructor
  constructor(settings: any) {
    super(settings)
  }

  processTemplates(oc: any) {
    const phase = this.settings.options.env
    const phases = this.settings.phases
    const objects = []
    const templatesLocalBaseUrl = oc.toFileUrl(path.resolve(__dirname, './openshift'))
    const deployParams = {
      NAME: phases[phase].name,
      SUFFIX: phases[phase].suffix,
      VERSION: phases[phase].tag,
      HOST: phases[phase].host,
      APPDATA_PVC_SIZE: phases[phase].appDataPvSize,
      LOG_PVC_SIZE: phases[phase].logPvSize,
      WEBAPP_NAME: this.settings.webappName,
      ROUTE_PATH: this.settings.routePath,
      ENV_PROXY_HOST: phases[phase].envProxyHost,
      INDEX: this.settings.index,
    }
    objects.push(
      ...oc.processDeploymentTemplate(`${templatesLocalBaseUrl}/deploy.yaml`, {
        param: deployParams,
      })
    )

    return objects
  }
}

export default async function (settings: any) {
  await new MyDeployer(settings).deploy()
}
