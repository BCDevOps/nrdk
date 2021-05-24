'use strict'

import isPlainObject from 'lodash.isplainobject'

export function isPlainObj(object: any): boolean {
  return object !== null && isPlainObject(object) && object.kind === 'List'
}
