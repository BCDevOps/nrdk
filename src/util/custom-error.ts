export class BasicCustomError extends Error {
  data: any

  date: Date

  constructor(data: any, ...params: any[]) {
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
