/* eslint-disable no-console */
import {flags} from '@oclif/command'

export interface GitFlags {
  'git.remote'?:  flags.IOptionFlag<string | undefined>;
  'git.remote.url'?:  flags.IOptionFlag<string | undefined>;
  'git.branch':  flags.IOptionFlag<string | undefined>;
  'git.branch.remote':  flags.IOptionFlag<string | undefined>;
}

export async function applyDefaults(_flags: any): Promise<void> {
  return Promise.resolve()
}
