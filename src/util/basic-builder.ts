/* eslint-disable valid-jsdoc */
/* eslint-disable max-params */
/* eslint-disable unicorn/import-index */
import {OpenShiftClientX, GitOperation} from '../'
import {Jira} from '../util/jira'
import {AxiosFactory} from '../api/service/axios-factory'
import {AxiosJiraClient} from '../api/service/axios-jira-client'

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
      const changeBranch = settings.options.git.branch.merge
      const gitUrl = settings.options.git.url
      const gitElements = gitUrl.split('/')
      const repoName = gitElements[7].split('.')[0]

      const EMPTY = ''
      const changeTarget = (settings?.options?.git?.change?.target || '').trim()

      if (changeTarget && changeTarget.toLowerCase() === 'master') {
        // Build for target = 'master'

        const jiraUrl = settings.jiraUrl
        const branchName = 'PR-' + settings.options.pr

        await this._createJiraAutoRFDs(jiraUrl, repoName, changeBranch, branchName, username, password)

        await this._gitTargetSyncVerify()
      } else if (changeTarget !== EMPTY) {
        // Build for target = 'other branch'
        await this._gitTargetSyncVerify()
      }

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

    /**
     * This create JIRA RFDs labled with 'auto' to be used only for our pipeiline deployment.
     * It creates 1 auto RFD for each environment for DLVR, TEST, PROD.
     */
    async _createJiraAutoRFDs(jiraUrl: string, repoName: string, changeBranch: string, branchName: string, username: string, password: string) {
      const jiraAxiosClient = await AxiosFactory.jira()
      const issueKey = await AxiosJiraClient.parseJiraIssueKeyFromUri(changeBranch)
      const rfcIssueKey = (await jiraAxiosClient.getRfcByIssue(issueKey)).key
      const projectName = rfcIssueKey.split('-')[0].toUpperCase()

      const jiraSettings = {
        url: jiraUrl,
        username: username,
        password: password,
        rfcIssueKey: rfcIssueKey,
        changeBranch: changeBranch,
        branchName: branchName,
        repoName: repoName,
        projectName: projectName,
      }

      const jira = new Jira(Object.assign({phase: 'jira-update', jira: jiraSettings}))
      return jira.createRFD()
    }
}
