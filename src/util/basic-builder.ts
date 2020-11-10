/* eslint-disable valid-jsdoc */
/* eslint-disable max-params */
/* eslint-disable unicorn/import-index */
import {OpenShiftClientX, GitOperation} from '../'
import {AxiosJiraClient} from '../api/service/axios-jira-client'
import {RfdHelper} from '../util/rfd-helper'
import {AxiosBitBucketClient} from '../api/service/axios-bitbucket-client'

export class BasicBuilder {
    settings: any

    constructor(settings: any) {
      this.settings = settings
    }

    processTemplates(_oc: any): any[] {
      return []
    }

    async build() {
      const settings = this.settings
      const phases = settings.phases
      const env = 'build'
      const username = settings.phases[env].credentials.idir.user
      const password = settings.phases[env].credentials.idir.pass
      Object.assign(settings.options.git, {credentials: {username: username, password: password}})
      const sourceBranch = settings.options.git.branch.merge
      // const EMPTY = ''
      const targetBranch = (settings?.options?.git?.change?.target || '').trim()

      // if (targetBranch && targetBranch.toLowerCase() === 'master') {
      // Build for target = 'master'
      const repo = AxiosBitBucketClient.parseUrl(settings.options.git.url)
      const issueKey =  await AxiosJiraClient.parseJiraIssueKeyFromUri(settings.options.git.branch.merge)

      const helper = new RfdHelper({})
      await helper.createDeployments({
        issue: {key: issueKey},
        pullRequest: {
          url: `https://apps.nrs.gov.bc.ca/int/stash/projects/${repo.project.key}/repos/${repo.slug}/pull-requests/${settings.options.pr}/overview`,
          number: settings.options.pr,
          sourceBranch: sourceBranch,
          targetBranch: targetBranch,
          repository: repo,
        },
        targetEnvironment: settings.environments,
      }).then(issues => {
        helper.print(issues)
      })
      // await this._createJiraAutoRFDs(jiraUrl, repoName, changeBranch, branchName, username, password)

      await this._gitTargetSyncVerify()
      // } else if (targetBranch !== EMPTY) {
      //  // Build for target = 'other branch'
      //  await this._gitTargetSyncVerify()
      // }

      const oc = new OpenShiftClientX(Object.assign({namespace: phases.build.namespace}, settings.options))
      const processedTemplate = this.processTemplates(oc)
      const phase = env
      oc.applyRecommendedLabels(
        processedTemplate,
        phases[phase].name,
        phase,
        phases[phase].changeId,
        phases[phase].instance
      )
      oc.applyAndBuild(processedTemplate)
      const git = new GitOperation(this.settings.options.git)
      return git.clear()
    } // end build

    /**
     * Calling Git module to verify if both change/target branches are not out of sync.
     */
    async _gitTargetSyncVerify() {
      const git = new GitOperation(this.settings.options.git)
      if (await git.isTargetBranchOutofSync()) {
        // eslint-disable-next-line no-console
        console.log('Successfully Verified that branch is not out of sync with target')
      }
    }
}
