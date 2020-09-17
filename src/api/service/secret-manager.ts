
import * as fs from 'fs'
import {homedir} from 'os'
import * as util from 'util'

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

  getProperty(name: string): Secret {
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

export const SVC_IDIR = 'IDIR'
export const SVC_IDIR_USERNAME = 'sAMAccountName'
export const SVC_IDIR_UPN = 'userPrincipalName'
export const SVC_IDIR_PASSWORD = 'password'

export class SecretManager {
  private static instance: SecretManager;

  private entries: any

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
    const readFile = util.promisify(fs.readFile)
    const content = await readFile(location, {encoding: 'utf8'})
    this.entries = JSON.parse(content)
  }

  getEntry(service: string): EntryAccessor {
    return new EntryAccessor(this.entries[service] as Entry)
  }
}
