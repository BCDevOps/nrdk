import {Tool} from './tool'
import * as path from 'path'
import {ChildProcess, SpawnOptions} from 'child_process'
import {LoggerFactory} from '../util/logger'
import {_spawn2, waitAndBuffer, waitToExit} from '../util/child-process'
import * as os from 'os'
import * as fs from 'fs'
import { SecretManager, SVC_IDIR_SPEC } from '../api/service/secret-manager'

export class Ansible extends Tool {
  static logger = LoggerFactory.createLogger(Ansible)

  public ansible_bin_run_command = 'ansible'

  async install(version: string): Promise<string> {
    // python3 -m pip show virtualenv
    // python3 -m pip install --user virtualenv
    const homeDirectory = await this.getHomeDirectory('ansible', version)
    return _spawn2(path.join(homeDirectory, 'bin', 'python3'), ['--version'])
    .then(waitAndBuffer)
    .then(proc => {
      if (proc.status  !== 0) {
        return _spawn2('python3', ['-m', 'pip', 'show', 'virtualenv'])
        .then(waitAndBuffer)
        .then(proc => {
          if (proc.status  !== 0) throw new Error('virtualenv module is not installed. Please install virtualenv')
          Ansible.logger.info('Creating python virtual environment')
          return _spawn2('python3', ['-m', 'virtualenv', homeDirectory])
          .then(waitAndBuffer)
          .then(proc => {
            if (proc.status  !== 0) throw new Error(`Error creating python virtual envvironment.\nexit code:${proc.status}\nstdout:${proc.stdout}\nstderr:${proc.stderr}`)
            return proc
          })
        })
      }
    })
    .then(() => {
      return _spawn2(path.join(homeDirectory, 'bin', 'python3'), ['-m', 'pip', 'show', 'ansible'], {stdio: 'ignore'})
      .then(waitToExit)
      .then(proc => {
        if (proc.status  === 0) return proc
        Ansible.logger.info(`Installing Ansible ${version}`)
        return _spawn2(path.join(homeDirectory, 'bin', 'python3'), ['-m', 'pip', 'install', `ansible==${version}`], {stdio: ['ignore', process.stdout, process.stderr]})
        .then(waitToExit)
        .then(proc => {
          if (proc.status  !== 0) throw new Error(`Error installling ansible.\nexit code:${proc.status}`)
          return proc
        })
      })
    })
    .then(() => {
      return homeDirectory
    })
  }

  async run(args: readonly string[], options?: SpawnOptions): Promise<ChildProcess> {
    // if (process.platform === "win32") return this.run_in_docker(args, options)
    return this.run_in_docker(args, options)
  }

  async run_native(args: readonly string[], options?: SpawnOptions): Promise<ChildProcess> {
    return this.install('2.10.5')
    .then(homeDirectory => {
      Ansible.logger.debug(`Running Ansible from ${homeDirectory}`)
      const env = {...process.env, ANSIBLE_ROLES_PATH: './.roles'}
      return _spawn2(path.join(homeDirectory, 'bin', 'python3'), [path.join(homeDirectory, 'bin', this.ansible_bin_run_command), ...args], {...options, env})
    })
  }

  async run_in_docker(args: readonly string[], options?: SpawnOptions): Promise<ChildProcess> {
    const version = '2.10.5'
    // const homeDirectory = await this.getHomeDirectory('ansible', version)
    const dockerImageTag = `nrdk/ansible:${version}`
    const dockerContainerIdFile  = path.join(os.tmpdir(), `nrdk-ansible-${version}.cid`)
    if (fs.existsSync(dockerContainerIdFile)) fs.unlinkSync(dockerContainerIdFile)

    return _spawn2('docker', ['build', '-t', dockerImageTag, '--build-arg', `ANSIBLE_VERSION=${version}`, path.join(__dirname, 'ansible')])
    .then(waitAndBuffer)
    .then(proc => {
      if (proc.status  !== 0) throw new Error(`Error running docker build.\nexit code:${proc.status}\nstdout:${proc.stdout}\nstderr:${proc.stderr}`)
      return _spawn2('docker', ['run', '-it', '-d=true', '--cidfile', dockerContainerIdFile, '-v', `${process.cwd()}:/workdir`, '-w', '/workdir', dockerImageTag, '/bin/sh'])
    })
    .then(waitToExit)
    .then(() => {
      const containerId = fs.readFileSync(dockerContainerIdFile, {encoding: 'utf8'})
      // we will setup git in-memory credential caching and warm it up to avoid password prompts
      return _spawn2('docker', ['exec', '-w', '/workdir', containerId, 'git', 'config', '--global', 'url.https://bwa.nrs.gov.bc.ca.insteadOf', 'https://apps.nrs.gov.bc.ca'], {stdio: 'ignore'})
      .then(waitToExit)
      .then(() => {
        return _spawn2('docker', ['exec', '-w', '/workdir', containerId, 'git', 'config', '--global', 'credential.helper', 'cache --timeout 3600'], {stdio: 'ignore'})
        .then(waitToExit)
      })
      .then(async () => {
        const entry = await (await SecretManager.getInstance()).getEntry(SVC_IDIR_SPEC)
        const idirUsername = (await entry.getProperty(SVC_IDIR_SPEC.fields.UPN.name)).getPlainText()
        const idirPassword = (await entry.getProperty(SVC_IDIR_SPEC.fields.PASSWORD.name))
        return _spawn2('docker', ['exec', '-i', '-w', '/workdir', containerId, 'git', 'credential', 'approve'], {stdio: ['pipe', 'inherit', 'inherit']})
        .then(proc => {
          proc.stdin?.end(`protocol=https\nhost=bwa.nrs.gov.bc.ca\nusername=${idirUsername}\npassword=${idirPassword}\n`, 'utf8')
          return proc
        })
        .then(waitToExit)
      })
      .then(() => {
        return _spawn2('docker', ['exec', '-w', '/workdir', containerId, '/opt/ansible/bin/python3', path.posix.join('/opt/ansible/bin', this.ansible_bin_run_command), ...args], options)
        .then(proc => {
          proc.on('exit', async () => {
            return _spawn2('docker', ['rm', '--force', containerId])
            .then(waitToExit)
            // eslint-disable-next-line max-nested-callbacks
            .then(() => {
              fs.unlinkSync(dockerContainerIdFile)
              return proc
            })
          })
          return proc
        })
      })
    })
    .then(proc => {
      return proc
    })
  }
}
