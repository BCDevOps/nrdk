import {GeneralError} from '../../error'

// Version and url vars
const version = '0.15.3'
const urlBase = `https://releases.hashicorp.com/terraform/${version}/terraform_${version}`
const zipUrls: Record<string, string> = {
  linux: `${urlBase}_linux_amd64.zip`,
  darwin: `${urlBase}_darwin_amd64.zip`,
  win32: `${urlBase}_windows_amd64.zip`,
}

// Select url by os (optional platform override)
function getUrlByOS(platform = require('os').platform()): string {
  for (const os in zipUrls) {
    if (os.match(platform)) return zipUrls[os]
  }
  throw new GeneralError('Failed to match operating system')
}

export const url = getUrlByOS()
export const bin = `/tmp/.nrdk/terraform/${version}/terraform`
export const dest = `/tmp/.nrdk/terraform/${version}`
