import isPlainObject from 'lodash.isplainobject'
import isString from 'lodash.isstring'
import {OpenShiftClient} from '..'
import {OpenShiftClientResult} from './openshift-client-result'

const {isArray} = Array

// /**
//  * @param {string} type 'selector', 'narrow', 'freeze'
//  * @param {*} kind
//  * @param {*} qualifier
//  *
//  * () selects all
//  * (string) selects all of name
//  * ("dc", "jenkins") selects a particular instance dc/jenkins
//  * ("dc/jenkins") selects a particular instance dc/jenkins
//  * (["dc/jenkins", "svc/jenkins"]) selects a particular list of resources
//  * ("dc", { alabel: 'avalue' }) // Selects using label values
//  */
export class OpenShiftResourceSelector extends OpenShiftClientResult {
  ids?: string[]

  kind?: string

  qualifier?: string[]

  labels?: string[]

  constructor(client: OpenShiftClient, type: string, kindOrList: string|string[], qualifier?: string[]) {
    super(client)

    // if it is a list of qualified names
    if (isArray(kindOrList)) {
      this.ids = []
      this.ids.push(...kindOrList)
    } else if (kindOrList.indexOf('/') >= 0) {
      this.ids = []
      this.ids.push(kindOrList)
    } else {
      this.kind = kindOrList
      if (isPlainObject(qualifier)) {
        this.labels = qualifier || []
      } else if (isString(qualifier)) {
        this.qualifier = qualifier
      }
    }
  }

  _isEmptyStatic(): boolean {
    return (this.ids !== undefined) && this.ids.length === 0
  }

  queryIdentifiers(): string[] {
    if (this._isEmptyStatic()) {
      return []
    }
    const args: any[] = [this.kind]
    if (this.qualifier) {
      args.push(this.qualifier)
    }
    const selectors: string[] = this.client.toCommandArgsArray({selector: this.labels})
    return this.client.objectDefAction('get', args.concat(selectors), null).identifiers()
  }

  identifiers(): string[] {
    if (this.ids) return this.ids
    return this.queryIdentifiers()
  }

  // /**
  //  * return {String[]}
  //  */
  names(): string[] {
    const _identifiers = this.identifiers()
    const names = []
    for (let i = 0; i < _identifiers.length; i += 1) {
      const name = _identifiers[i]
      names.push(name.substr(name.indexOf('/') + 1))
    }
    return names
  }

  /**
   * return {String}
   */
  // // eslint-disable-next-line class-methods-use-this
  /*
  name() {
    throw new Error('Not Implemented');
  }
  */
  delete(args: string[]): any[] {
    return this.client.delete(this.names(), args)
  }

  async startBuild(args?: any): Promise<any> {
    const _names = this.identifiers()
    return this.client.startBuild(_names, args)
  }

  cancelBuild(args: string[]): any[] {
    return this.client.cancelBuild(this.names(), args)
  }

  narrow(kind: string): any {
    const result = []
    if (kind === 'bc') {
      const names = this.identifiers()
      for (let i = 0; i < names.length; i += 1) {
        const name = names[i]
        const kind2 = name.split('/')[1]
        // eslint-disable-next-line prettier/prettier
        if (kind2 === 'bc' || kind2 === 'buildconfig' || kind2 === 'buildconfig.build.openshift.io') {
          result.push(name)
        }
      }
    }
    return new OpenShiftResourceSelector(this.client, 'static', result)
  }
}
