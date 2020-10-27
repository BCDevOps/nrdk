import {Command, flags} from '@oclif/command'
import * as tls from 'tls'
import * as fs from 'fs'
import {spawn} from 'child_process'

function pemEncode(str: string, n: number): string {
  const ret = []
  for (let i = 1; i <= str.length; i++) {
    ret.push(str[i - 1])
    const mod = i % n
    if (mod === 0) {
      ret.push('\n')
    }
  }
  return `-----BEGIN CERTIFICATE-----\n${ret.join('')}\n-----END CERTIFICATE-----`
}

export default class UtilTls extends Command {
  static description = 'TLS/SSL utillities'

  static hidden = true

  static flags = {
    endpoint: flags.string({char: 'e', description: 'Target endpoint in the format "<hostname>:<port>". E.g.: "www2.gov.bc.ca:443"'}),
    format: flags.string({char: 'f', description: 'Output format', default: 'pem', options: ['pem', 'p12']}),
    output: flags.string({char: 'o', description: 'Output File. Defaults to stdout/"-".', default: '-'}),
    storepass: flags.string({description: 'Truststore password', default: 'changeit'}),
  }

  static args = [{name: 'endpoint', description: ''}]

  async getCertificateChain(endpoint: string) {
    const _endpoint = endpoint?.split(':') as string[]
    const socket = tls.connect(parseInt(_endpoint[1], 10), _endpoint[0], {rejectUnauthorized: false, ciphers: 'ALL'})
    const chain: tls.DetailedPeerCertificate[] = []
    return new Promise(resolve => {
      socket.on('secureConnect', () => {
        let certificate = socket.getPeerCertificate(true)
        while (certificate) {
          const cert: any = certificate
          chain.push(cert)
          cert.pemEncoded = pemEncode(certificate.raw.toString('base64'), 64)
          if (certificate === certificate.issuerCertificate) {
            break
          }
          certificate = certificate.issuerCertificate
        }
        socket.end()
        resolve(chain)
      // eslint-disable-next-line no-console
      // console.dir(certs)
      })
    }) as Promise<tls.DetailedPeerCertificate[]>
  }

  getOutputFilePath(input: string, allowStdOut: boolean, defaultValue: string) {
    if (input === '-' && !allowStdOut) {
      return defaultValue
    }
    if (input) {
      return input
    }
    return defaultValue
  }

  async run() {
    const {flags} = this.parse(UtilTls)
    const chain = await this.getCertificateChain(flags.endpoint as string)
    if (flags.format === 'pem') {
      const stream = process.stdout
      for (const certificate of chain) {
        stream.write(pemEncode(certificate.raw.toString('base64'), 64))
        stream.write('\n')
      }
    } else if (flags.format === 'p12') {
      await chain.reverse().reduce(async (previousPromise, certificate, index) => {
        await previousPromise
        return new Promise(resolve => {
          const outputFilePath = this.getOutputFilePath(flags.output, false, 'truststore.p12')
          const tempCertificatePath = '.____certificate.pem'
          fs.writeFileSync(tempCertificatePath, pemEncode(certificate.raw.toString('base64'), 64))
          spawn('keytool', [
            '-importcert',
            '-storetype',
            'PKCS12',
            '-keystore',
            outputFilePath,
            '-storepass',
            flags.storepass as string,
            '-alias',
            `chain-${index}`,
            '-file',
            'certificate.pem',
            '-noprompt',
          ]).on('exit', () => {
            fs.unlinkSync(tempCertificatePath)
            resolve(true)
          })
        }) as Promise<boolean>
      }, Promise.resolve(true))
    }
  }
}
