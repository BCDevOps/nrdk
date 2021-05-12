const version = '0.15.3'
const linkbase = `https://releases.hashicorp.com/terraform/${version}`
const platform = require('os').platform() || 'Failed to detect operating system'

const binaries = {
  linux: {
    dest: '/usr/local/bin',
    link: `${linkbase}/terraform_${version}_linux_amd64.zip`,
  },
  macos: {
    dest: '/usr/local/bin',
    link: `${linkbase}/terraform_${version}_darwin_amd64.zip`,
  },
  windows: {
    dest: '/usr/local/bin',
    link: `${linkbase}/terraform_${version}_windows_amd64.zip`,
  },
}

class Settings {
  app = 'Terraform';

  platform = platform;

  version = version;

  binary: object = {};
}

function installer(platform: string): Settings {
  const settings = new Settings()
  if (platform === 'linux') {
    settings.binary = binaries.linux
  } else if (platform === 'darwin') {
    settings.binary = binaries.macos
  } else if (platform === 'win32') {
    settings.binary = binaries.windows
  }
  return settings
}

module.exports = {
  version: version,
  binary: binaries,
  installer: installer(platform),
}
