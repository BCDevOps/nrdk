/* eslint-disable no-console */
/**
 * Calling the script would expect to contain arguments of:
 *  --env=[target environment],
 *  --pr=[the pr number]
 *
 * Script assumes:
 *  'srcFolderName' =  "functional-testing" to be the folder to contain source code for testing using "NodeJs".
 *  'runCommand': default running command for Node using npm to run
 * The two above can be configured from project's config.js file.
 *
 * Environment variables:
 *  - TARGET_TESTING_URL: will be internally constructed from query route object to Openshift namespace, and
 *                        is exposed to test environment before running tests.
 *  - TARGET_ENV: will also be exposed to test environment as specified from --env argument
 *  - UITEST_SKIP: can be used to skip tests
 */

import {OpenShiftClientX} from '../pipeline-cli/openshift-client-x'
import * as fs from 'fs'
import * as path from 'path'
import * as util from 'util'
const exec = util.promisify(require('child_process').exec)

export class BasicFunctionalTester {
  settings: any

  constructor(settings: any) {
    this.settings = settings
  }

  async runFunctionalTests() {
    const options = this.settings.options
    const targetEnv = options.env
    console.log(`Working under directory: ${process.cwd()}`)
    console.log(`Target environment: ${targetEnv}`)
    console.log('User arguments:', options)

    const currentPhase = this.settings.phases[targetEnv]
    const oc = new OpenShiftClientX(Object.assign({namespace: currentPhase.namespace}, options))
    const routeSpce = oc.get('route', {
      selector: `app=${currentPhase.instance},env-id=${currentPhase.changeId},github-owner=${oc.git.owner}`,
      namespace: currentPhase.namespace,
    })[0].spec
    const targetUrl = ''.concat(
      routeSpce.tls.termination === 'edge' ? 'https' : 'http',
      '://',
      routeSpce.host,
      routeSpce.path
    )
    console.log(`Targeted URL for testing is retrived as: '${targetUrl}' for environment: ${targetEnv}`)

    // current phase settings
    const uitestConfig = {
      srcFolderName: 'functional-testing', // default test folder name, relative to project folder
      skip: 'false', // default
      runCommand: 'npm ci && npm run headless-chrome-tests', // sample command
      env: Object.assign(
        {},
        {PATH: process.env.PATH, HOME: process.env.HOME},
        {TARGET_ENV: targetEnv, TARGET_TESTING_URL: targetUrl},
        {APPDATA: process.env.APPDATA}
      ),
    }
    if (currentPhase.uitest !== undefined) {
      const userConfig = currentPhase.uitest
      uitestConfig.srcFolderName =
                userConfig.srcFolderName && userConfig.srcFolderName.trim() !== '' ?
                  userConfig.srcFolderName :
                  uitestConfig.srcFolderName
      uitestConfig.skip = process.env.UITEST_SKIP ? process.env.UITEST_SKIP : uitestConfig.skip
      uitestConfig.runCommand =
                userConfig.runCommand && userConfig.runCommand.trim() !== '' ?
                  userConfig.runCommand :
                  uitestConfig.runCommand
      userConfig.env ?
        Object.assign(uitestConfig.env, userConfig.env) :
        Object.assign(uitestConfig.env)
    }

    if (uitestConfig.skip && uitestConfig.skip.trim() === 'true') {
      console.log('User UITEST_SKIP is set. Skipping functional tests.')
    } else {
      const testFolderDir = path.resolve(process.cwd(), `./${uitestConfig.srcFolderName}/`)
      console.log('Resolved Testing Folder Dir:', testFolderDir)
      fs.access(testFolderDir, function (error) {
        if (error) {
          console.error('Directory does not exist or no permission', error)
          throw error
        }
      })

      console.log('Process environments: ', uitestConfig.env)
      console.log('Run Command: ', uitestConfig.runCommand)
      try {
        const {stdout} = await exec(`${uitestConfig.runCommand}`, {
          cwd: `${testFolderDir}`,
          env: uitestConfig.env,
        })
        console.log('Finished running test: \n', stdout)
      } catch (error) {
        console.error('Error: Command execution failed: ', error)
        throw error
      }
    }
  } // end of runFunctionalTests method
}
