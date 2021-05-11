const VERSION = '0.15.3'
const DL_PATH = 'https://releases.hashicorp.com/terraform'

module.exports = {
  version: VERSION,
  binary: {
    linux: `${DL_PATH}/${VERSION}/terraform_${VERSION}_linux_amd64.zip`,
    macos: `${DL_PATH}/${VERSION}/terraform_${VERSION}_darwin_amd64.zip`,
    windows: `${DL_PATH}/${VERSION}/terraform_${VERSION}_windows_amd64.zip`,
  },
  destination: {
    linux: '/usr/local/bin',
    macos: '/usr/local/bin',
    windows: '/usr/local/bin',
  },
}
