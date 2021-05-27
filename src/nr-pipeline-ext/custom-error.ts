export class BasicCustomError extends Error {
  data: string

  date: Date

  name: string

  constructor(data: any, ...params: string[]) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(...params)

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BasicCustomError)
    }

    this.name = 'BasicCustomError'
    // Custom debugging information
    this.data = data
    this.date = new Date()
  }
}

// Add other CustomeError(s) if needed.

module.exports = {BasicCustomError}
