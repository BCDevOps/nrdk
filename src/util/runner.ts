import {Terraform} from '../tools/terraform'
import {streamOutput} from '../util/child-process'
import {SpawnOptions} from 'child_process'

// Runner provides a shorthand to oclif commands
export async function runner(argv: string[], spawnOptions?: SpawnOptions) {
  const tf = new Terraform()

  // Run command
  return tf.run(argv, spawnOptions || {stdio: ['ignore',  'pipe', 'pipe']})

  // Wait for output to complete
  .then(streamOutput(process.stdout, process.stderr))

  // Return exit status
  .then(proc => proc.status as number)
}
