import sharp from 'sharp'
import { PDFDocument, PDFName } from 'pdf-lib'
import QRCode from 'qrcode'
import { configuredOrigins } from '../config/security.js'
import { httpError } from '../utils/httpError.js'

export const maximumFileSize = 5 * 1024 * 1024

export async function prepareAvatar(buffer) {
  try {
    const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
    const webp = buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP'
    if (buffer.length > maximumFileSize || !(png || jpeg || webp)) throw new Error()
    const image = sharp(buffer, { limitInputPixels: 16_000_000, failOn: 'warning' })
    const metadata = await image.metadata()
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) !== 1 || !metadata.width || !metadata.height) throw new Error()
    // Re-encoding strips EXIF/GPS metadata; SVG, GIF and animated inputs are not accepted.
    return await image.rotate().resize(512, 512, { fit: 'cover' }).webp({ quality: 85 }).toBuffer()
  } catch { throw httpError(400, 'Use a valid, still JPEG, PNG or WebP photo under 5 MB and 16 megapixels.') }
}

export async function prepareResume(buffer) {
  try {
    if (buffer.length > maximumFileSize) throw new Error()
    if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error()
    const source = await PDFDocument.load(buffer, { updateMetadata: false })
    if (source.getPageCount() < 1 || source.getPageCount() > 20) throw new Error()
    for (const page of source.getPages()) {
      const { width, height } = page.getSize()
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width > 2000 || height > 2000) throw new Error()
      page.node.delete(PDFName.of('Annots'))
      page.node.delete(PDFName.of('AA'))
      page.node.delete(PDFName.of('PresSteps'))
    }
    // Copy page content into a fresh catalog; document actions, attachments and form fields are not carried across.
    const output = await PDFDocument.create()
    const pages = await output.copyPages(source, source.getPageIndices())
    pages.forEach((page) => output.addPage(page))
    output.setTitle('Resume')
    const result = Buffer.from(await output.save())
    if (result.length > maximumFileSize) throw new Error()
    return result
  } catch { throw httpError(400, 'Use a valid, unencrypted PDF resume under 5 MB with 1–20 pages. Interactive annotations are removed.') }
}

export async function prepareProfileQr(freelancerId, origin) {
  if (!/^FF-[A-F0-9]{12}$/.test(freelancerId) || !configuredOrigins().has(origin)) throw httpError(400, 'Invalid profile QR destination.')
  const link = new URL(`/freelancers/${freelancerId}`, origin).href
  return QRCode.toBuffer(link, { type: 'png', width: 480, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#2a1263', light: '#ffffff' } })
}
