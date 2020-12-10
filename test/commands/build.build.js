/* eslint-disable no-console */
const MyBuilder = class {
  build() {
    console.log('Build started')
    console.log('Build finished')
  }
}
module.exports = async settings => {
  await new MyBuilder(settings).build()
}
