import {Context} from 'mocha'
import {Maven} from '../../src/tools/maven'
import {waitForSuccessfulExitCode} from '../../src/util/child-process'
import {LoggerFactory} from '../../src/util/logger'

describe('tools/maven', function () {
  LoggerFactory.ROOT.level = 'debug'
  it('mvn -version', async function (this: Context) {
    const maven = new Maven()
    maven.run(['-version'])
    .then(proc => {
      if (proc.stdout) proc.stdout.pipe(process.stdout)
      if (proc.stderr) proc.stderr.pipe(process.stderr)
      return waitForSuccessfulExitCode(proc)
    })
  })
})
