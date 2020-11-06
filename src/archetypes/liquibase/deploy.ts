import * as path from 'path'
import * as fs from 'fs'
import Liquibase from '../../util/liquibase'
import { cwd } from 'process'
const OpenShiftClientX = require.main?.exports.OpenShiftClientX as any
const Verifier = require.main?.exports.InputDeployerVerify as any

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
    let isValid = true
    if (this.settings.options['rfc-validation'] === true) {
      const verify = new Verifier(Object.assign(this.settings))
      const verifyStatus = await verify.verifyBeforeDeployment()
      isValid = verifyStatus.status === 'Ready'
    }

    if (isValid === true) {
      await this.migrateAll(path.resolve(this.cwd(), './migrations'))
    }
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
      return liquibase.spawn([`--defaultsFile=${propertiesFilePath}`, 'changelogSyncSQL'], {cwd: this.cwd(), stdio: ['ignore', process.stdout, process.stderr]})
    })
  }

  async prepare(migrationDirPath: string, schemaName: string): Promise<string> {
    const env = this.settings.options.env
    const namespace = this.settings.phases[env].namespace

    const oc = new OpenShiftClientX(Object.assign({namespace: namespace}))
    const dbsecret = oc.get(`secret/db-${schemaName.toLowerCase().replace(/_/g, '-')}-${env}`)[0]

    const baseDirPath = path.relative(this.cwd(), migrationDirPath)

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
    const changeLogFile = path.join(baseDirPath, 'changelog.xml')
    const logFile = path.join(baseDirPath, 'deployment.log')

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
