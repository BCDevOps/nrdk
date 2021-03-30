/* eslint-disable valid-jsdoc */
/* eslint-disable max-params */
/* eslint-disable unicorn/import-index */
import {OpenShiftClientX, CONST} from '../'
import {AxiosBitBucketClient} from '../api/service/axios-bitbucket-client'
import {AxiosJiraClient} from '../api/service/axios-jira-client'
import {GeneralError} from '../error'
import {FlagNames} from '../flags'
import {RfdHelper} from '../util/rfd-helper'
import {ValidationError} from '../validation-error'

export class BasicJavaApplicationDeployer {
  settings: any

  constructor(settings: any) {
    this.settings = settings
  }

  /**
     * returns an array on openshift resources
     */
  processTemplates(_oc: any): any[] {
    return []
  }

  // CI or CD deployment
  isCDdeployment() {
    const env = this.settings.options.env.toLowerCase()
    if (env === CONST.ENV.DEV || env === 'sbox' || env === 'sandbox') {
      return false
    // eslint-disable-next-line max-statements-per-line
    } if (env === CONST.ENV.DLVR || env === CONST.ENV.TEST || env === CONST.ENV.PROD) {
      return true
    }
    throw new Error("Unknown 'env' value: " + env)
  }

  async deploy() {
    if (this.settings.options['local-mode'] === 'true' || this.settings.options[FlagNames.RFC_VALIDATION] === false || !this.isCDdeployment()) {
      await this.deployOpenshift()
    } else {
      const helper = new RfdHelper({})
      const sourceBranch = this.settings.options.git.branch.merge
      const targetBranch = (this.settings?.options?.git?.change?.target || '').trim()
      const repo = AxiosBitBucketClient.parseUrl(this.settings.options.git.url)
      const issueKey =  await AxiosJiraClient.parseJiraIssueKeyFromUri(sourceBranch)
      await helper.deploymentStarted({
        issue: {key: issueKey},
        pullRequest: {
          url: `https://apps.nrs.gov.bc.ca/int/stash/projects/${repo.project.key}/repos/${repo.slug}/pull-requests/${this.settings.options.pr}/overview`,
          number: this.settings.options.pr,
          sourceBranch: sourceBranch,
          targetBranch: targetBranch,
          repository: repo,
        },
        targetEnvironment: this.settings.options.env,
      })
      .then(async result => {
        helper.print(result.issues)
        if (result.errors && result.errors.length !== 0) {
          for (const error of result?.errors) {
            // eslint-disable-next-line no-console
            console.error(error.cause)
          }
          throw new ValidationError('Validation Errors', result.errors)
        }
        await this.deployOpenshift()
        .then(async () => {
          return helper.deploymentSuccessful({
            issue: {key: issueKey},
            pullRequest: {
              url: `https://apps.nrs.gov.bc.ca/int/stash/projects/${repo.project.key}/repos/${repo.slug}/pull-requests/${this.settings.options.pr}/overview`,
              number: this.settings.options.pr,
              sourceBranch: sourceBranch,
              targetBranch: targetBranch,
              repository: repo,
            },
            targetEnvironment: this.settings.options.env,
          })
        })
        .catch(async error => {
          // eslint-disable-next-line no-console
          console.error(error)
          await helper.deploymentFailed({
            issue: {key: issueKey},
            pullRequest: {
              url: `https://apps.nrs.gov.bc.ca/int/stash/projects/${repo.project.key}/repos/${repo.slug}/pull-requests/${this.settings.options.pr}/overview`,
              number: this.settings.options.pr,
              sourceBranch: sourceBranch,
              targetBranch: targetBranch,
              repository: repo,
            },
            targetEnvironment: this.settings.options.env,
          })
          throw new GeneralError(error)
        })
        return result
      })
    }
  }

  async deployOpenshift() {
    const settings = this.settings
    const phases = settings.phases
    const options = settings.options
    const phase = settings.options.env
    const changeId = phases[phase].changeId
    const oc = new OpenShiftClientX(Object.assign({namespace: phases[phase].namespace}, options))
    const objects = this.processTemplates(oc)

    oc.applyRecommendedLabels(objects, phases[phase].name, phase, `${changeId}`, phases[phase].instance)
    oc.importImageStreams(objects, phases[phase].tag, phases.build.namespace, phases.build.tag)
    return oc.applyAndDeploy(objects, phases[phase].instance)
  }
}
