import * as fs from 'fs'

module.exports = class LibTest {
  static process(filePath: string, args: any) {
    let template = fs.readFileSync(filePath, {encoding: 'utf-8'})
    const templateAsJson = JSON.parse(template)
    const params = Object.assign({}, args.param || {})

    templateAsJson.parameters.forEach((p: any) => {
      if (params[p.name] !== null && p.value !== null) {
        params[p.name] = p.value
      }
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
