import * as readline from 'readline'

export default class PropertiesFile {
  static async read(input: NodeJS.ReadableStream):  Promise<Map<string, string>> {
    const result = new Map<string, string>()
    const readInterface = readline.createInterface(input)
    readInterface.on('line', line => {
      const m = line.match(/^(?<key>[^=]*)=(?<value>.*)/m)
      if (m?.groups !== null) {
        const key = m?.groups?.key
        const value = m?.groups?.value
        if (key && value) {
          result.set(key.trim(), value.trim())
        }
      }
    })

    return new Promise(resolve => {
      readInterface.on('close', () => {
        resolve(result)
      })
    })
  }
}
