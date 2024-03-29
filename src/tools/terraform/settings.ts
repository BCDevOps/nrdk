import {GeneralError} from '../../error'
import * as os from 'os'

// Version and url vars
export const version = '0.15.3'
const urlBase = `https://releases.hashicorp.com/terraform/${version}/terraform_${version}`
const zipUrls: Record<string, string> = {
  linux: `${urlBase}_linux_amd64.zip`,
  darwin: `${urlBase}_darwin_amd64.zip`,
  win32: `${urlBase}_windows_amd64.zip`,
}

// Select url by os (optional platform override)
function getUrlByOS(platform = os.platform()): string {
  for (const os in zipUrls) {
    if (os.match(platform)) return zipUrls[os]
  }
  throw new GeneralError('Failed to match operating system')
}
export const url = getUrlByOS()
