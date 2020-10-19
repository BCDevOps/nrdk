export class GeneralError extends Error {
  constructor(m: string, parent?: Error) {
    super(m)
    // restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype)
    Error.captureStackTrace(this, GeneralError)

    if (parent) {
      const current_stack =  this.stack as string
      const parent_stack = parent.stack as string
      this.stack = current_stack + '\n' + parent_stack
    }
  }
}
