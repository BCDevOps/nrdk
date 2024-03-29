import {Command} from '@oclif/command'
import {AxiosBitBucketClient, RepositoryReference} from './api/service/axios-bitbucket-client'
import {AxiosJiraClient} from './api/service/axios-jira-client'
import {AxiosFactory} from './api/service/axios-factory'
import {SpawnOptions, SpawnSyncReturns} from 'child_process'
import * as winston from 'winston'
import * as Config from '@oclif/config'
import {_spawn} from './util/child-process'

export abstract class GitBaseCommand extends Command {
  jiraClient?: AxiosJiraClient

  bitBucketClient?: AxiosBitBucketClient

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

  async init() {
    this.jiraClient = await AxiosFactory.jira()
    this.bitBucketClient = await AxiosFactory.bitBucket()
  }

  jira(): AxiosJiraClient {
    return this.jiraClient as AxiosJiraClient
  }

  bitBucket(): AxiosBitBucketClient {
    return this.bitBucketClient as AxiosBitBucketClient
  }

  async _spawn(command: string, argsv?: readonly string[], options?: SpawnOptions): Promise<SpawnSyncReturns<string>> {
    return _spawn(this.logger, command, argsv as readonly string[], options as SpawnOptions)
  }

  async createBranch(issue: any, repository: RepositoryReference, branchName: string, startPoint = 'master') {
    if (repository.url?.startsWith('https://github.com/')) {
      const githubClient =  await AxiosFactory.gitHub(repository.url)
      return githubClient.createBranchIfMissing(repository, branchName, startPoint)
    }
    const devDetails = (await this.jira().getBranches(issue.id))
    const branches = devDetails.branches.filter((item: { name: string }) => item.name === branchName)
    // this.log('branches:', branches)
    if (branches.length === 0) {
      this.log(`Creating branch '${branchName}' from '${startPoint}' in repository '${repository.slug}' in project '${repository.project.key}'`)
      await this.bitBucket().createBranch(repository.project.key, repository.slug, branchName, startPoint)
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
