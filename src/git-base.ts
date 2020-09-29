import {Command} from '@oclif/command'
import {AxiosBitBucketClient, RepositoryReference} from './api/service/axios-bitbucket-client'
import {AxiosJiraClient} from './api/service/axios-jira-client'
import {AxiosFactory} from './api/service/axios-factory'
import {SpawnOptions, spawn} from 'child_process'
import * as winston from 'winston'
import * as Config from '@oclif/config'

export abstract class GitBaseCommand extends Command {
  // eslint-disable-next-line no-useless-escape
  static JIRA_ISSUE_KEY_REGEX = /(([^\/]+\/)+)?(?<issueKey>[^-]+-\d+)/gm;

  jira?: AxiosJiraClient

  bitBucket?: AxiosBitBucketClient

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

  async _spawn(command: string, argsv?: readonly string[], options?: SpawnOptions): Promise<{status: number; stdout: string; stderr: string}> {
    this.logger.child({group: ['exec', command], args: argsv}).info('%s %s', command, (argsv || []).join(' '))
    return new Promise(resolve => {
      let stdout = ''
      let stderr = ''
      const child = spawn(command, argsv, options)
      child.stdout.on('data', data => {
        stdout += data
      })
      child.stderr.on('data', data => {
        stderr += data
      })
      child.on('exit', status => {
        resolve({status: status as number, stdout, stderr})
      })
    })
  }

  async createBranch(issue: any, repository: RepositoryReference, branchName: string, startPoint = 'master') {
    const jira = this.jira as AxiosJiraClient
    const bitBucket = this.bitBucket as AxiosBitBucketClient
    const devDetails = (await jira.getBranches(issue.id))
    const branches = devDetails.branches.filter((item: { name: string }) => item.name === branchName)
    // this.log('branches:', branches)
    if (branches.length === 0) {
      this.log(`Creating branch '${branchName}' from '${startPoint}' in repository '${repository.slug}' in project '${repository.project.key}'`)
      await bitBucket.createBranch(repository.project.key, repository.slug, branchName, startPoint)
    } else if (branches.length > 1) {
      return this.error(`Expected 1 release but found '${branches.length}'`)
    }
    return {name: branchName, repository}
  }

  async createReleaseBranch(rfc: any, repository: RepositoryReference) {
    const releaseBranch = `release/${rfc.key}`
    return this.createBranch(rfc, repository, releaseBranch)
  }

  async init() {
    this.jira = await AxiosFactory.jira()
    this.bitBucket = await AxiosFactory.bitBucket()
  }
}
