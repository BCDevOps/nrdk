import * as path from 'path'
import * as fs from 'fs'
import Liquibase from '../../util/liquibase'
import {AxiosBitBucketClient} from '../../api/service/axios-bitbucket-client'
import {AxiosJiraClient} from '../../api/service/axios-jira-client'
import {GeneralError} from '../../error'
import {RfdHelper} from '../../util/rfd-helper'
import {ValidationError} from '../../validation-error'
import {FlagNames} from '../../flags'
const OpenShiftClientX = require.main?.exports.OpenShiftClientX as any

export class LiquibaseDeployer {
  settings: any

  // eslint-disable-next-line no-useless-constructor
  constructor(settings: any) {
    this.settings = settings
  }

  cwd(): string {
    return this.settings.options.git.dir
  }

  async deploy() {
    const helper = new RfdHelper({})
    const sourceBranch = this.settings.options.git.branch.merge
    const targetBranch = (this.settings?.options?.git?.change?.target || '').trim()
    const repo = AxiosBitBucketClient.parseUrl(this.settings.options.git.url)
    const issueKey =  await AxiosJiraClient.parseJiraIssueKeyFromUri(sourceBranch)
    if (this.settings.options['rfc-validation'] === true) {
      await helper.deploymentStarted({
        issue: {key: issueKey},
        pullRequest: {
          url: AxiosBitBucketClient.createPullRequestUrl(repo, this.settings.options.pr),
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
        return result
      })
    } else {
      // eslint-disable-next-line no-console
      console.warn('RFC Validation has been turned off!!!')
    }
    await this.migrateAll(path.resolve(this.cwd(), './migrations'))
    .then(async () => {
      return helper.deploymentSuccessful({
        issue: {key: issueKey},
        pullRequest: {
          url: AxiosBitBucketClient.createPullRequestUrl(repo, this.settings.options.pr),
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
          url: AxiosBitBucketClient.createPullRequestUrl(repo, this.settings.options.pr),
          number: this.settings.options.pr,
          sourceBranch: sourceBranch,
          targetBranch: targetBranch,
          repository: repo,
        },
        targetEnvironment: this.settings.options.env,
      })
      throw new GeneralError('Deployment failed', error)
    })
  }

  async migrateAll(migrationsDir: string) {
    const files = fs.readdirSync(migrationsDir)
    for (const file of files) {
      const migrationDir = path.join(migrationsDir, file)
      const stats = fs.lstatSync(migrationDir)
      if (stats.isDirectory()) {
        if (fs.existsSync(path.join(migrationDir, 'changelog.xml'))) {
          // eslint-disable-next-line no-await-in-loop
          await this.deploySchema(migrationDir, file)
        }
      }
    }
    return Promise.resolve(true)
  }

  async deploySchema(migrationDir: string, schemaName: string) {
    const liquibase = new Liquibase()
    return  this.prepare(migrationDir, schemaName)
    .then(propertiesFilePath => {
      let liquibaseCommand = 'update'
      if (this.settings[FlagNames.DRY_RUN] === true) {
        liquibaseCommand = 'validate'
      }
      return liquibase.spawn([`--defaultsFile=${propertiesFilePath}`, liquibaseCommand], {cwd: this.cwd(), stdio: ['ignore', process.stdout, process.stderr]})
    })
  }

  async prepare(migrationDirPath: string, schemaName: string): Promise<string> {
    const env = this.settings.options.env
    const namespace = this.settings.phases[env].namespace

    const oc = new OpenShiftClientX(Object.assign({namespace: namespace}))
    const dbsecret = oc.get(`secret/db-${schemaName.toLowerCase().replace(/_/g, '-')}-${env}`)[0]
    const posixCwd = this.cwd().replace(/\\/g, '/')
    const posixMigrationDirPath = migrationDirPath.replace(/\\/g, '/')
    const baseDirPath = path.posix.relative(posixCwd, posixMigrationDirPath)

    const cleanUpFiles = []
    // No need for keystore for now.

    // truststore.p12
    const truststoreFilePath = path.join(migrationDirPath, 'truststore.p12')
    const truststoreFileStream = fs.createWriteStream(truststoreFilePath)
    truststoreFileStream.write(Buffer.from(dbsecret.data['truststore.p12'], 'base64'))
    truststoreFileStream.close()
    cleanUpFiles.push(truststoreFilePath)

    // ojdbc.properties
    const ojdbcFilePath = path.join(migrationDirPath, 'ojdbc.properties')
    const ojdbcFileStream = fs.createWriteStream(ojdbcFilePath)
    ojdbcFileStream.write(Buffer.from(dbsecret.data['ojdbc.properties'], 'base64'))
    ojdbcFileStream.close()
    cleanUpFiles.push(ojdbcFilePath)

    // tnsnames.ora
    const tnsnamesFilePath = path.join(migrationDirPath, 'tnsnames.ora')
    const tnsnamesFileStream = fs.createWriteStream(tnsnamesFilePath)
    tnsnamesFileStream.write(Buffer.from(dbsecret.data['tnsnames.ora'], 'base64'))
    tnsnamesFileStream.close()
    cleanUpFiles.push(tnsnamesFilePath)

    // Liquibase properties file
    const dbusername = Buffer.from(dbsecret.data.username, 'base64').toString('utf-8')
    const dbpassword = Buffer.from(dbsecret.data.password, 'base64').toString('utf-8')
    const tnsname = Buffer.from(dbsecret.data['tnsnames.ora'], 'base64').toString('utf-8')
    const tnsentry = tnsname.split('=')[0].trim()
    const changeLogFile = path.posix.join(baseDirPath, 'changelog.xml')
    const logFile = path.posix.join(baseDirPath, 'deployment.log')

    const propertiesFilePath = path.join(migrationDirPath, 'deployment.properties')
    const propertiesFileStream = fs.createWriteStream(propertiesFilePath)
    propertiesFileStream.write(Buffer.from('driver: oracle.jdbc.OracleDriver\n'))
    propertiesFileStream.write(Buffer.from(`url: jdbc:oracle:thin:@${tnsentry}?TNS_ADMIN=${baseDirPath}\n`))
    propertiesFileStream.write(Buffer.from(`username: ${dbusername}\n`))
    propertiesFileStream.write(Buffer.from(`password: ${dbpassword}\n`))
    propertiesFileStream.write(Buffer.from(`changeLogFile: ${changeLogFile}\n`))
    propertiesFileStream.write(Buffer.from('logLevel: debug\n'))
    propertiesFileStream.write(Buffer.from(`logFile: ${logFile}\n`))
    propertiesFileStream.close()

    return new Promise(resolve => {
      propertiesFileStream.on('close', () => {
        resolve(propertiesFilePath)
      })
    })
  }
}

export default async function (settings: any) {
  await new LiquibaseDeployer(settings).deploy()
}
