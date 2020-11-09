import winston from 'winston'

export class LoggerFactory {
  public static readonly ROOT = LoggerFactory.createRootLogger();

  static createRootLogger() {
    return winston.createLogger({
      levels: winston.config.cli.levels,
      level: 'info',
      format: winston.format.json(),
      // defaultMeta: ,
      transports: [
        new winston.transports.Console(),
      ],
    })
  }

  static createLogger(category: any) {
    if (typeof category !== 'string') {
      if (category?.constructor?.name) {
        return LoggerFactory.ROOT.child({category: category?.constructor?.name})
      }
      throw new Error(`Invalid Category type: ${typeof category}`)
    }
    return LoggerFactory.ROOT.child({category: category})
  }
}
