'use strict'
module.paths.push(...require.main.paths.slice(0, 3)) // required hack to use module dependencies!
module.exports = class {
  constructor(options) {
    this.options = options || {}
  }

  build() {
    return {options: this.options}
  }
}
