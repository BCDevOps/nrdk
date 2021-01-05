import {Command} from '@oclif/command'
import {RepositoryReference} from './api/service/axios-client'
import {AxiosBitBucketClient} from './api/service/axios-bitbucket-client'
import {AxiosJiraClient} from './api/service/axios-jira-client'
import {AxiosFactory} from './api/service/axios-factory'
import {SpawnOptions, SpawnSyncReturns} from 'child_process'
import * as winston from 'winston'
import * as Config from '@oclif/config'
import {_spawn} from './util/child-process'

export abstract class GitBaseCommand extends Command {
  private jiraClient?: AxiosJiraClient

  private bitBucketClient?: AxiosBitBucketClient

  logger: winston.Logger

  constructor(argv: string[], config: Config.IConfig) {
    super(argv, config)
    this.logger = winston.createLogger({
      levels: winston.config.cli.levels,
      format: winston.format.combine(
        winston.format.splat(),
        winston.format.printf(info => `${info.level}: ${info.message}`)
      ),
      transports: [new winston.transports.Console()],
    })
  }

  initClients() {
    this.jiraClient = AxiosFactory.jira()
    this.bitBucketClient = AxiosFactory.bitBucket()
  }

  async jira(): Promise<AxiosJiraClient> {
    if (this.jiraClient === undefined) {
      this.initClients()
    }
    return this.jiraClient as AxiosJiraClient
  }

  async bitBucket(): Promise<AxiosBitBucketClient> {
    if (this.bitBucket === undefined) {
      this.initClients()
    }
    return this.bitBucketClient as AxiosBitBucketClient
  }

  async _spawn(command: string, argsv?: readonly string[], options?: SpawnOptions): Promise<SpawnSyncReturns<string>> {
    return _spawn(this.logger, command, argsv as readonly string[], options as SpawnOptions)
  }

  async createBranch(issue: any, repository: RepositoryReference, branchName: string, startPoint = 'master') {
    const devDetails = await (await this.jira()).getBranches(issue.id)
    const branches = devDetails.branches.filter((item: { name: string }) => item.name === branchName)
    // this.log('branches:', branches)
    if (branches.length === 0) {
      this.log(`Creating branch '${branchName}' from '${startPoint}' in repository '${repository.slug}' in project '${repository.project.key}'`)
      await (await this.bitBucket()).createBranch(repository.project.key, repository.slug, branchName, startPoint)
    } else if (branches.length > 1) {
      return this.error(`Expected 1 release but found '${branches.length}'`)
    }
    return {name: branchName, repository}
  }

  async createReleaseBranch(rfc: any, repository: RepositoryReference) {
    const releaseBranch = `release/${rfc.key}`
    return this.createBranch(rfc, repository, releaseBranch)
  }

  async cwd() {
    return process.cwd()
  }
}
