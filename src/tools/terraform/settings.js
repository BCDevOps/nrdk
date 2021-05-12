const version = '0.15.3'
const download = `https://releases.hashicorp.com/terraform/${version}`
const platform = require('os').platform()

const binaries = {
  detected: platform,
  linux: {
    dest: '/usr/local/bin',
    link: `${download}/terraform_${version}_linux_amd64.zip`,
  },
  macos: {
    dest: '/usr/local/bin',
    link: `${download}/terraform_${version}_darwin_amd64.zip`,
  },
  windows: {
    dest: '/usr/local/bin',
    link: `${download}/terraform_${version}_windows_amd64.zip`,
  },
}

function installer() {
  const toReturn = {
    app: 'Terraform',
    platform: platform,
    version: version,
  }
  switch (platform) {
  case 'linux':
    toReturn.binary = binaries.linux
    return toReturn
  case 'darwin':
    toReturn.binary = binaries.macos
    return toReturn
  case 'win32':
    toReturn.binary = binaries.windows
    return toReturn
  default:
    return 'unknown'
  }
}

module.exports = {
  version: version,
  binary: binaries,
  installer: installer(),
}
