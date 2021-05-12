const VERSION = '0.15.3'
const DL_PATH = `https://releases.hashicorp.com/terraform/${VERSION}`

module.exports = {
  version: VERSION,
  binary: {
    linux: {
      dest: '/usr/local/bin',
      link: `${DL_PATH}/terraform_${VERSION}_linux_amd64.zip`,
    },
    macos: {
      dest: '/usr/local/bin',
      link: `${DL_PATH}/terraform_${VERSION}_darwin_amd64.zip`,
    },
    windows: {
      dest: '/usr/local/bin',
      link: `${DL_PATH}/terraform_${VERSION}_windows_amd64.zip`,
    },
  },
}
