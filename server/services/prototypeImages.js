import sharp from 'sharp'
import { maximumFileSize } from './profileMedia.js'
import { MAX_IMAGE_BYTES } from '../utils/prototypes.js'
import { httpError } from '../utils/httpError.js'

export async function prepareDesign(buffer) {
  try {
    const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
    const webp = buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP'
    if (buffer.length > maximumFileSize || !(png || jpeg || webp)) throw new Error()
    const image = sharp(buffer, { limitInputPixels: 16_000_000, failOn: 'warning' })
    const metadata = await image.metadata()
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) !== 1) throw new Error()
    // Keep the complete design and its aspect ratio; re-encoding removes metadata and active content.
    const { data, info } = await image.rotate().webp({ quality: 90 }).toBuffer({ resolveWithObject: true })
    if (data.length > MAX_IMAGE_BYTES) throw httpError(400, 'The processed design exceeds 2 MB. Export a smaller image and try again.')
    return { data, width: info.width, height: info.height }
  } catch (error) {
    if (error.expose) throw error
    throw httpError(400, 'Use a still JPEG, PNG or WebP design under 5 MB and 16 megapixels.')
  }
}
