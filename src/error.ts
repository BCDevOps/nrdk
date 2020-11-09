export class GeneralError extends Error {
  constructor(m: string, parent?: Error) {
    super(m)
    // restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype)
    Error.captureStackTrace(this, GeneralError)

    if (parent) {
      const current_stack =  (this.stack as string).split('\n')
      const parent_stack = (parent.stack as string).split('\n')
      // .slice(0, 2)
      this.stack = current_stack.join('\n') + '\n' + parent_stack.join('\n')
    }
  }
}
