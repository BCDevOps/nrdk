import {GeneralError} from './error'

export class ValidationError extends GeneralError {
  errors: any[]

  constructor(m: string, errors: any[], parent?: Error) {
    super(m, parent)
    this.errors = errors
  }
}
