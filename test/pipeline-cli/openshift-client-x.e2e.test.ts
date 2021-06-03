const expect = require('expect')
import {OpenShiftClientX} from '../../src/pipeline-cli/openshift-client-x'
import {OpenShiftResourceSelector} from '../../src/pipeline-cli/openshift-resource-selector'

const PROJECT_TOOLS = 'csnr-devops-lab-tools'

describe.skip('OpenShiftClientX - @e2e', () => {
  const oc = new OpenShiftClientX({namespace: PROJECT_TOOLS})

  it.skip('e2e - @e2e', () => {
    const params = {NAME: 'my-test-app'}

    const fileUrl = oc.toFileUrl(`${__dirname}/resources/bc.template.json`)
    const processResult = oc.process(fileUrl, {param: params})

    oc.delete(oc.toNamesList(processResult), {'ignore-not-found': 'true'})

    expect(processResult).toBeInstanceOf(Array)
    expect(processResult).toHaveLength(4)

    oc.applyBestPractices(oc.wrapOpenShiftList(processResult))
    oc.applyRecommendedLabels(processResult, 'my-test-app', 'dev', '1')
    oc.fetchSecretsAndConfigMaps(processResult)

    const applyResult = oc.apply(processResult)
    expect(applyResult).toBeInstanceOf(OpenShiftResourceSelector)

    expect(applyResult.names()).toEqual([
      `imagestream.image.openshift.io/${params.NAME}`,
      `imagestream.image.openshift.io/${params.NAME}-core`,
      `buildconfig.build.openshift.io/${params.NAME}-core`,
      `buildconfig.build.openshift.io/${params.NAME}`,
    ])
    applyResult.narrow('bc').startBuild({wait: 'true'})
  }) // end it
}) // end describe
