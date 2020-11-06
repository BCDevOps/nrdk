import * as path from 'path'
import * as fs from 'fs'

const Verifier = require.main?.exports.InputDeployerVerify as any
const Liquibase = require.main?.exports.Liquibase as any

export class LiquibaseDeployer {
  settings: any

  // eslint-disable-next-line no-useless-constructor
  constructor(settings: any) {
    this.settings = settings
  }

  async deploy() {
    let isValid = true
    if (this.settings.options['rfc-validation'] === true) {
      const verify = new Verifier(Object.assign(this.settings))
      const verifyStatus = await verify.verifyBeforeDeployment()
      isValid = verifyStatus.status === 'Ready'
    }

    if (isValid === true) {
      this.migrateAll(path.resolve(process.cwd(), './migrations'))
    }
  }

  async migrateAll(migrationsDir: string) {
    const files = fs.readdirSync(migrationsDir)
    for (const file of files) {
      const migrationDir = path.join(migrationsDir, file)
      const stats = fs.lstatSync(migrationDir)
      if (stats.isDirectory()) {
        // eslint-disable-next-line no-await-in-loop
        await this.deploySchema(migrationDir, file)
      }
    }
    return Promise.resolve(true)
  }

  async deploySchema(migrationsDir: string, schemaName: string) {
    const credentials = this.settings.phases.build.credentials.idir
    // console.log(schemaName)
    const liquibase = new Liquibase({credentials, ...this.settings})
    return liquibase.migrate(migrationsDir, schemaName)
  }
}

export default async function (settings: any) {
  await new LiquibaseDeployer(settings).deploy()
}
