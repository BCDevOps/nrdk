'use strict'
const expect = require('expect')
const sandbox = require('sinon').createSandbox()
const {OpenShiftClientX} = require('@bcgov/pipeline-cli')
const Jira = require('../lib/Jira')
const Verifier = require('../lib/InputDeployerVerify')
const BasicJavaApplicationDeployer = require('../lib/BasicJavaApplicationDeployer')

describe('BasicJavaApplicationDeployer:', function () {
  this.timeout(50000)

  let ocApplyRecommendedLabelsStub
  let ocApplyAndDeployStub
  let ocImportImageStreamsStub
  let verifyBeforeDeploymentStub
  let jiraTransitionRFDpostDeploymentStub

  // stubing
  this.beforeEach(function () {
    ocApplyRecommendedLabelsStub = sandbox.stub(OpenShiftClientX.prototype, 'applyRecommendedLabels')
    ocApplyAndDeployStub = sandbox.stub(OpenShiftClientX.prototype, 'applyAndDeploy')
    ocImportImageStreamsStub = sandbox.stub(OpenShiftClientX.prototype, 'importImageStreams')
    verifyBeforeDeploymentStub = sandbox.stub(Verifier.prototype, 'verifyBeforeDeployment')
    jiraTransitionRFDpostDeploymentStub = sandbox.stub(Jira.prototype, 'transitionRFDpostDeployment')
  })

  afterEach(function () {
    sandbox.restore()
  })

  context("When 'CI' deployment ...", function () {
    it('Just do deploy...', async function () {
      // Arrange
      const settingsStub = getDefaultSettings()
      settingsStub.options.env = 'sandbox'
      const deployer = new BasicJavaApplicationDeployer(settingsStub)
      const isCDdeploymentStub = sandbox.stub(deployer, 'isCDdeployment')
      isCDdeploymentStub.returns(false)
      const deployOpenshiftStub = sandbox.stub(deployer, 'deployOpenshift')

      // Act
      await deployer.deploy()

      // Verify
      sandbox.assert.calledOnce(isCDdeploymentStub)
      sandbox.assert.calledOnce(deployOpenshiftStub)
      sandbox.assert.notCalled(verifyBeforeDeploymentStub)
      sandbox.assert.notCalled(jiraTransitionRFDpostDeploymentStub)
    })
  })

  context("When 'CD' deployment ...", function () {
    it('When JIRA verify conditon pass, do RFD transition in its env then deploy...', async function () {
      // Arrange
      const settingsStub = getDefaultSettings()
      settingsStub.options.env = 'test'
      const deployer = new BasicJavaApplicationDeployer(settingsStub)
      const isCDdeploymentStub = sandbox.stub(deployer, 'isCDdeployment')
      isCDdeploymentStub.returns(true)
      verifyBeforeDeploymentStub.returns(Promise.resolve('Ready'))
      const deployOpenshiftStub = sandbox.stub(deployer, 'deployOpenshift')

      // Act
      await expect(deployer.deploy()).rejects.toThrow()

      // Verify
      sandbox.assert.calledOnce(isCDdeploymentStub)
      sandbox.assert.notCalled(deployOpenshiftStub)
      sandbox.assert.calledOnce(verifyBeforeDeploymentStub)
      sandbox.assert.notCalled(jiraTransitionRFDpostDeploymentStub)
      // sandbox.assert.calledWith(jiraTransitionRFDpostDeploymentStub, settingsStub.options.env)
    })

    it('When JIRA verify conditon fail, faile pipeline', async function () {
      // Arrange
      const settingsStub = getDefaultSettings()
      settingsStub.options.env = 'test'
      const deployer = new BasicJavaApplicationDeployer(settingsStub)
      const isCDdeploymentStub = sandbox.stub(deployer, 'isCDdeployment')
      isCDdeploymentStub.returns(true)
      verifyBeforeDeploymentStub.returns(Promise.resolve('Not Ready'))
      const deployOpenshiftStub = sandbox.stub(deployer, 'deployOpenshift')

      // Act
      try {
        await deployer.deploy()
      } catch (err) {
        expect(err.message).toContain('Not Ready for Deployment')
      }

      // Verify
      sandbox.assert.calledOnce(isCDdeploymentStub)
      sandbox.assert.calledOnce(verifyBeforeDeploymentStub)
      sandbox.assert.notCalled(deployOpenshiftStub)
      sandbox.assert.notCalled(jiraTransitionRFDpostDeploymentStub)
    })
  })

  it("When env is either 'dev', 'sbox' or 'sandbox', it should be CI deployment...", async function () {
    const settingsStub = getDefaultSettings()

    settingsStub.options.env = 'dev'
    let deployer = new BasicJavaApplicationDeployer(settingsStub)
    let isCDdeployment = deployer.isCDdeployment()
    expect(isCDdeployment).toBe(false)

    settingsStub.options.env = 'sbox'
    deployer = new BasicJavaApplicationDeployer(settingsStub)
    isCDdeployment = deployer.isCDdeployment()
    expect(isCDdeployment).toBe(false)

    settingsStub.options.env = 'sandbox'
    deployer = new BasicJavaApplicationDeployer(settingsStub)
    isCDdeployment = deployer.isCDdeployment()
    expect(isCDdeployment).toBe(false)
  })

  it("When env is either 'dlvr', 'test' or 'prod', it should be CD deployment...", async function () {
    const settingsStub = getDefaultSettings()

    settingsStub.options.env = 'dlvr'
    let deployer = new BasicJavaApplicationDeployer(settingsStub)
    let isCDdeployment = deployer.isCDdeployment()
    expect(isCDdeployment).toBe(true)

    settingsStub.options.env = 'test'
    deployer = new BasicJavaApplicationDeployer(settingsStub)
    isCDdeployment = deployer.isCDdeployment()
    expect(isCDdeployment).toBe(true)

    settingsStub.options.env = 'prod'
    deployer = new BasicJavaApplicationDeployer(settingsStub)
    isCDdeployment = deployer.isCDdeployment()
    expect(isCDdeployment).toBe(true)
  })

  it("When 'env' is unknown value, it stops pipeline", function () {
    const settingsStub = getDefaultSettings()
    settingsStub.options.env = 'unknown-env'
    const deployer = new BasicJavaApplicationDeployer(settingsStub)
    expect(() => deployer.isCDdeployment()).toThrow()
  })

  context('Deploy to OpenShift', function () {
    it('When called, will use pipeline-cli to apply labels, import Images and deploy', async function () {
      // Arrange
      const settingsStub = getDefaultSettings()
      settingsStub.options.env = 'test'
      const deployer = new BasicJavaApplicationDeployer(settingsStub)
      const processedTemplateStub = {processTemplates: 'myTemplate'}
      sandbox.stub(deployer, 'processTemplates').callsFake(() => processedTemplateStub)

      // Act
      await deployer.deployOpenshift()

      // Verify
      sandbox.assert.calledOnce(deployer.processTemplates)
      sandbox.assert.calledOnce(ocApplyRecommendedLabelsStub)
      sandbox.assert.calledWith(
        ocApplyRecommendedLabelsStub,
        processedTemplateStub,
        settingsStub.phases[settingsStub.phase].name,
        settingsStub.phase,
        settingsStub.phases[settingsStub.phase].changeId,
        settingsStub.phases[settingsStub.phase].instance,
      )
      sandbox.assert.calledOnce(ocImportImageStreamsStub)
      sandbox.assert.calledWith(
        ocImportImageStreamsStub,
        processedTemplateStub,
        settingsStub.phases[settingsStub.phase].tag,
        settingsStub.phases.build.namespace,
        settingsStub.phases.build.tag,
      )
      sandbox.assert.calledOnce(ocApplyAndDeployStub)
      sandbox.assert.calledWith(
        ocApplyAndDeployStub,
        processedTemplateStub,
        settingsStub.phases[settingsStub.phase].instance,
      )
    })
  })

  function getDefaultSettings() {
    const defaultSettings = {
      phases: {
        build: {
          namespace: 'wp9gel-tools',
          phase: 'build',
          tag: 'build-1.0-1',
        },
        test: {
          namespace: 'wp9gel-test',
          name: 'siwe',
          phase: 'test',
          changeId: '1',
          tag: 'test-1.0',
          instance: 'siwe-test',
          transient: false,
          host: 'siwe-test-wp9gel-test.pathfinder.bcgov',
          credentials: {
            idir: {
              user: 'stub@gov.bc.ca',
              pass: 'stub',
            },
          },
        },
      },
      options: {
        git: {
          branch: {
            name: 'master',
            merge: 'master',
            remote: 'master',
          },
          url: 'https://bwa.nrs.gov.bc.ca/int/stash/scm/siwe/siwe-siwe-ear.git',
          dir: '/Users/iliu/Workspace/Repo/spi/spi-siwe-ear',
          uri: 'https://bwa.nrs.gov.bc.ca/int/stash/scm/siwe/siwe-siwe-ear.git',
          http_url: 'https://bwa.nrs.gov.bc.ca/int/stash/scm/siwe/siwe-siwe-ear.git',
          owner: 'SIWE',
          repository: 'siwe-siwe-ear',
        },
        env: 'test',
        pr: '1',
        cwd: '/some/user/Workspace/Repo/spi/spi-siwe-ear',
      },
      jiraUrl: 'bwa.nrs.gov.bc.ca/int/jira',
      bitbucketUrl: 'https://bwa.nrs.gov.bc.ca/int/stash',
      phase: 'test',
    }
    return defaultSettings
  } // getDefaultSettings
})
