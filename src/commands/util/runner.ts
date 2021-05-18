import {streamOutput} from '../../util/child-process'
import {SpawnOptions} from 'child_process'
import {Terraform} from '../../tools/terraform'

export async function runner(argv: string[], spawnOptions?: SpawnOptions) {
  const op: SpawnOptions = spawnOptions || {stdio: ['ignore',  'pipe', 'pipe']}
  const tf = new Terraform()
  return tf.run(argv, op)
  .then(streamOutput(process.stdout, process.stderr))
  .then(proc => proc.status as number)
}
