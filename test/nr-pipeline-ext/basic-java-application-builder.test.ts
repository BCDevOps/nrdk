'use strict'
const sandbox = require('sinon').createSandbox()
const {OpenShiftClientX} = require('@bcgov/pipeline-cli')
const Jira = require('../lib/Jira')
const Git = require('../lib/GitOperation')
const BasicJavaApplicationBuilder = require('../lib/BasicJavaApplicationBuilder')

describe('BasicJavaApplicationBuilder:', function () {
  this.timeout(50000)

  let ocApplyRecommendedLabelsStub
  let ocApplyAndBuildStub
  let jiraCreateRfdStub

  // stubing
  this.beforeEach(function () {
    ocApplyRecommendedLabelsStub = sandbox.stub(OpenShiftClientX.prototype, 'applyRecommendedLabels')
    ocApplyAndBuildStub = sandbox.stub(OpenShiftClientX.prototype, 'applyAndBuild')
    jiraCreateRfdStub = sandbox.stub(Jira.prototype, 'createRFD')
  })

  afterEach(function () {
    sandbox.restore()
  })

  context("When target is a 'master'...", function () {
    it('It should call Jira createRFD, verify git is not out of sync, and applyAndBuild using oc', async function () {
      // Arrange
      const settingsStub = getDefaultSettings()
      settingsStub.options.git.change.target = 'master'
      const builder = new BasicJavaApplicationBuilder(settingsStub)
      const processedTemplateStub = {processTemplates: 'myTemplate'}
      sandbox.stub(Git.prototype, 'isTargetBranchOutofSync').returns(Promise.resolve(false))
      sandbox.stub(builder, 'processTemplates').callsFake(() => processedTemplateStub)

      // Act
      await builder.build()

      // Verify
      sandbox.assert.calledOnce(builder.processTemplates)
      sandbox.assert.calledOnce(jiraCreateRfdStub)
      sandbox.assert.calledOnce(ocApplyRecommendedLabelsStub)
      sandbox.assert.calledWith(
        ocApplyRecommendedLabelsStub,
        processedTemplateStub,
        settingsStub.phases[settingsStub.phase].name,
        settingsStub.phase,
        settingsStub.phases[settingsStub.phase].changeId,
        settingsStub.phases[settingsStub.phase].instance,
      )
      sandbox.assert.calledOnce(ocApplyAndBuildStub)
      sandbox.assert.calledWith(ocApplyAndBuildStub, processedTemplateStub)
    })
  })

  context("When target is not a 'master'...", function () {
    it("when passing git 'verify'...it should applyAndBuild using oc", async function () {
      // Arrange
      const settingsStub = getDefaultSettings()
      settingsStub.options.git.change.target = 'NOT_A_Master_Branch'
      const builder = new BasicJavaApplicationBuilder(settingsStub)
      const processedTemplateStub = []
      sandbox.stub(Git.prototype, 'isTargetBranchOutofSync').returns(Promise.resolve(false))
      sandbox.stub(builder, 'processTemplates').callsFake(() => processedTemplateStub)

      // Act
      await builder.build()

      // Verify
      sandbox.assert.calledOnce(builder.processTemplates)
      sandbox.assert.notCalled(jiraCreateRfdStub)
      sandbox.assert.calledOnce(ocApplyRecommendedLabelsStub)
      sandbox.assert.calledWith(
        ocApplyRecommendedLabelsStub,
        processedTemplateStub,
        settingsStub.phases[settingsStub.phase].name,
        settingsStub.phase,
        settingsStub.phases[settingsStub.phase].changeId,
        settingsStub.phases[settingsStub.phase].instance,
      )
      sandbox.assert.calledOnce(ocApplyAndBuildStub)
      sandbox.assert.calledWith(ocApplyAndBuildStub, processedTemplateStub)
    })
  })

  context('When no target branch defined from calling this module...', function () {
    it("When 'target' is not defined, will do the build but no JIRA createRFD", async function () {
      // Arrange
      const settingsStub = getDefaultSettings()
      settingsStub.options.git.change.target = undefined
      const builder = new BasicJavaApplicationBuilder(settingsStub)
      const processedTemplateStub = {processTemplates: 'myTemplate'}
      sandbox.stub(builder, 'processTemplates').callsFake(() => processedTemplateStub)

      // Act
      await builder.build()

      // Verify
      sandbox.assert.calledOnce(builder.processTemplates)
      sandbox.assert.notCalled(jiraCreateRfdStub)
      sandbox.assert.calledOnce(ocApplyRecommendedLabelsStub)
      sandbox.assert.calledOnce(ocApplyAndBuildStub)
    })

    it("When 'git.change' is not defined, will do the build but no JIRA createRFD", async function () {
      // Arrange
      const settingsStub = getDefaultSettings()
      settingsStub.options.git.change = undefined
      const builder = new BasicJavaApplicationBuilder(settingsStub)
      const processedTemplateStub = {processTemplates: 'myTemplate'}
      sandbox.stub(builder, 'processTemplates').callsFake(() => processedTemplateStub)

      // Act
      await builder.build()

      // Verify
      sandbox.assert.calledOnce(builder.processTemplates)
      sandbox.assert.notCalled(jiraCreateRfdStub)
      sandbox.assert.calledOnce(ocApplyRecommendedLabelsStub)
      sandbox.assert.calledOnce(ocApplyAndBuildStub)
    })
  })

  function getDefaultSettings() {
    const defaultSettings = {
      phases: {
        build: {
          namespace: 'wp9gel-tools',
          changeId: '9999',
          instance: 'siwe-build-9999',
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
            name: 'feature/ZERO-9999-my-branch',
            merge: 'feature/ZERO-9999-my-branch',
            remote: 'feature/ZERO-9999-my-branch',
          },
          url: 'https://bwa.nrs.gov.bc.ca/int/stash/scm/siwe/siwe-siwe-ear.git',
          change: {
            target: 'RFC-999-test',
          },
        },
        env: 'build',
        pr: '9999',
      },
      jiraUrl: 'bwa.nrs.gov.bc.ca/int/jira',
      bitbucketUrl: 'https://bwa.nrs.gov.bc.ca/int/stash',
      phase: 'build',
    }
    return defaultSettings
  }
})
