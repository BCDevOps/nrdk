export default abstract class Entry {
  getProperty(name: string): string {
    throw new Error(`Method not implemented. (${name})`)
  }
}
