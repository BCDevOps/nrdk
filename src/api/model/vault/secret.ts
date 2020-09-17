import Entry from './entry'

export default class Secret {
  private entry: Entry

  private property: string

  constructor(entry: Entry, property: string) {
    this.entry = entry
    this.property = property
  }

  getPlainText(): string {
    return this.entry.getProperty(this.property)
  }
}
