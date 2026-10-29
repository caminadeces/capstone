import { readFileSync } from 'node:fs'
import path from 'node:path'
import tls from 'node:tls'

export function configureAwsCaBundle() {
  const configuredPath = process.env.AWS_CA_BUNDLE?.trim()
  const useSystemCa = process.env.AWS_USE_SYSTEM_CA?.trim().toLowerCase() === 'true'
  if (!configuredPath && !useSystemCa) return

  const certificates = []
  if (configuredPath) {
    const bundlePath = path.resolve(process.cwd(), configuredPath)
    const contents = readFileSync(bundlePath, 'utf8')
    const bundleCertificates = contents
      .split(/(?=-----BEGIN CERTIFICATE-----)/)
      .map(certificate => certificate.trim())
      .filter(Boolean)

    if (!bundleCertificates.length || bundleCertificates.some(certificate => (
      !certificate.startsWith('-----BEGIN CERTIFICATE-----') ||
      !certificate.includes('-----END CERTIFICATE-----')
    ))) {
      throw new Error('AWS_CA_BUNDLE must point to a PEM file containing one or more CA certificates.')
    }
    certificates.push(...bundleCertificates)
  }

  if (typeof tls.getCACertificates !== 'function' || typeof tls.setDefaultCACertificates !== 'function') {
    throw new Error('AWS_CA_BUNDLE and AWS_USE_SYSTEM_CA require Node.js 22.19 or newer. Upgrade Node.js or set NODE_EXTRA_CA_CERTS before starting the process.')
  }
  if (useSystemCa) certificates.push(...tls.getCACertificates('system'))

  tls.setDefaultCACertificates([
    ...tls.getCACertificates('default'),
    ...certificates,
  ])
}
