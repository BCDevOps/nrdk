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

class Installer {
  app = 'Terraform';

  platform = platform;

  version = version;

  binary: object = {};
}

export function getInstaller(os = platform): Installer {
  const settings = new Installer()
  if (os === 'linux') {
    settings.binary = binaries.linux
  } else if (os === 'darwin' || os === 'macos') {
    settings.binary = binaries.macos
  } else if (os === 'win32' || os === 'windows') {
    settings.binary = binaries.windows
  }
  return settings
}

export const settings = {
  version: version,
  binaries: binaries,
  installer: getInstaller(),
}
