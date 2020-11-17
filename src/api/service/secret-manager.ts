
import * as fs from 'fs'
import {homedir} from 'os'
import * as util from 'util'
import * as inquirer from 'inquirer'

const prompt = inquirer.createPromptModule()
declare let __SecretManager: any | undefined | null

class Secret {
  private _value: string

  constructor(value: string) {
    this._value = value
    Object.defineProperty(this, 'inspect', {
      enumerable: false,
      configurable: false,
      writable: false,
      value: function () {
        return this.toString()
      },
    })
  }

  public getPlainText(): string {
    return this._value
  }

  public toString = (): string => {
    return '*****'
  }

  /**
   * Hide values from util.inspect, console.log, console.dir.
   * @returns {string} Masked value
   */
  // [util.inspect.custom](): string {
  //   return this.toString()
  // }
}

class EntryAccessor {
  private entry: Entry

  constructor(entry: Entry) {
    this.entry = entry
  }

  async getProperty(name: string): Promise<Secret> {
    let _value: any = this.entry[name]
    if (_value instanceof Secret) {
      return _value
    }
    _value = new Secret(_value)
    this.entry[name] = _value
    return _value
  }
}

type Entry = any
export interface ServiceFieldSpec {name: string; prompt?: string; hint?: string; type: string}
export interface ServiceSpec {name: string; url: string; fields: object}
export interface IdirServiceSpec extends ServiceSpec {
  fields: {
    UPN: ServiceFieldSpec;
    // USERNAME: ServiceFieldSpec;
    PASSWORD: ServiceFieldSpec;
  };
}

export const SVC_IDIR_SPEC = {
  name: 'IDIR',
  url: 'https://bwa.nrs.gov.bc.ca/int/jira/rest/api/2/myself',
  fields: {
    UPN: {name: 'userPrincipalName', hint: 'e-mail format- e.g.: john.doe@gov.bc.ca'},
    // USERNAME: {name: 'sAMAccountName', hint: 'username without domain - e.g. jdoe'},
    PASSWORD: {name: 'password', type: 'password'},
  },
} as IdirServiceSpec

export const SVC_IDIR = SVC_IDIR_SPEC.name
export const SVC_IDIR_USERNAME = 'sAMAccountName'
export const SVC_IDIR_UPN = 'userPrincipalName'
export const SVC_IDIR_PASSWORD = 'password'

export class SecretManager {
  private static instance: SecretManager;

  private entries: any = {}

  private location = '~/nrdk/.secrets.json'

  static async getInstance(): Promise<SecretManager> {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager()
      await SecretManager.instance.load()
    }
    return SecretManager.instance
  }

  private async load() {
    // resolve ~/ to current user home directory
    const location = this.location.replace(/^~(?=$|\/|\\)/, homedir())
    if (fs.existsSync(location)) {
      const readFile = util.promisify(fs.readFile)
      const content = await readFile(location, {encoding: 'utf8'})
      Object.assign(this.entries, JSON.parse(content))
    }
  }

  public static loadEntries(entries: any) {
    const gbl = global as any
    gbl.__SecretManager =  gbl.__SecretManager || {}
    Object.assign(gbl.__SecretManager, entries)
  }

  async promptMissingFields(spec: ServiceSpec, svc: any) {
    const prompts = []
    const fieldsSpec = spec.fields as any
    for (const fieldName of Object.keys(fieldsSpec)) {
      const fieldSpec = fieldsSpec[fieldName] as ServiceFieldSpec
      if (!svc[fieldSpec.name]) {
        let message = fieldSpec.prompt || `'${fieldSpec.name}' for '${spec.name}'`
        if (fieldSpec.hint) {
          message += ` (${fieldSpec.hint})`
        }
        prompts.push({type: fieldSpec.type || 'input', name: fieldSpec.name, message: message})
      }
    }
    // console.log(`Prompting \n:${new Error().stack}`)
    return prompt(prompts)
  }

  async getEntry(service: ServiceSpec): Promise<EntryAccessor> {
    const defaults: any =  {}
    if (typeof __SecretManager !== 'undefined') {
      Object.assign(defaults, __SecretManager)
    }
    const svc = this.entries[service.name] as Entry || defaults[service.name] as Entry || {}
    this.entries[service.name] = svc
    if (svc) {
      const answers = await this.promptMissingFields(service, svc)
      for (const fieldName of Object.keys(answers)) {
        svc[fieldName] = answers[fieldName]
      }
    }
    if (!svc?.name) {
      svc.name = service
    }
    return new EntryAccessor(svc)
  }
}
