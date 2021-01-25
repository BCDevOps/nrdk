import {Maven} from '../../tools/maven'
import {BasicBuilder} from '../../util/basic-builder'
import {waitForSuccessfulExitCode} from '../../util/child-process'

const MyBuilder = class extends BasicBuilder {
  // eslint-disable-next-line no-useless-constructor
  constructor(settings: any) {
    super(settings)
  }

  async build() {
    // const settings = this.settings
    // npx @bcgov/nrdk tool:mvn clean package deploy -DdeployAtEnd=true -DaltDeploymentRepository=nrdk-maven-dist::default::http://bwa.nrs.gov.bc.ca/int/artifactory/ephemeral
    // npx @bcgov/nrdk tool:mvn help:effective-pom
    // mvn build-helper:parse-version versions:set -DnewVersion=\${parsedVersion.majorVersion}.\${parsedVersion.minorVersion}.\${parsedVersion.incrementalVersion}-RC-$(git rev-parse --short HEAD) versions:commit
    const mvn = new Maven()
    return mvn.run(
      ['clean', 'package', 'deploy', '-DdeployAtEnd=true', '-DaltDeploymentRepository=nrdk-maven-dist::default::http://bwa.nrs.gov.bc.ca/int/artifactory/ephemeral'],
      {stdio: ['ignore', process.stdout, process.stderr]}
    )
    .then(waitForSuccessfulExitCode)
    .then(() => {/** this is empty on purpose! */})
    // Search Artifacts
    // https://apps.nrs.gov.bc.ca/int/artifactory/api/search/gavc?g=ca.bc.gov.nrs.ffs&v=7.3.1*&repos=ephemeral
  }
}

export default async function (settings: any) {
  await new MyBuilder(settings).build()
}
