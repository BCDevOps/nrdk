import winston from 'winston'

export class LoggerFactory {
  public static readonly ROOT = LoggerFactory.createRootLogger();

  static createRootLogger() {
    return winston.createLogger({
      levels: winston.config.cli.levels,
      level: 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.simple()),
      // defaultMeta: ,
      transports: [
        new winston.transports.Console(),
      ],
    })
  }

  static createLogger(category: any) {
    if (typeof category === 'function') {
      if (category.prototype && category.constructor && category.name) {
        return LoggerFactory.ROOT.child({category: category.name})
      }
      throw new Error(`Invalid Category type: ${typeof category}`)
    }
    return LoggerFactory.ROOT.child({category: category})
  }
}
