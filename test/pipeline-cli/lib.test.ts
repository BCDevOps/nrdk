import * as fs from 'fs'

export class LibTest {
  // Process template, params from args and template
  static process(filePath: string, args: any) {
    let template = fs.readFileSync(filePath, {encoding: 'utf-8'})
    const templateAsJson = JSON.parse(template)
    const params = Object.assign({}, args.param || {})
    // Pick up additional params from template.parameters
    templateAsJson.parameters.forEach((p: any) => {
      // If param not already present, then add it
      if (!params[p.name] && p.value !== undefined) params[p.name] = p.value
    })

    Object.keys(params).forEach(prop => {
      const value = params[prop]
      if (value !== null) {
        const regex = new RegExp(`(?<!\\\\)\\$\\{${prop}\\}`, 'gm')
        template = template.replace(regex, value)
      }
    })

    const items = JSON.parse(template).objects
    items.forEach((item: any) => {
      if (item.kind === 'BuildConfig') {
        item.kind = 'buildconfig.build.openshift.io'
      } else if (item.kind === 'ImageStream') {
        item.kind = 'imagestream.image.openshift.io'
      }
    })
    return items
  }
}
