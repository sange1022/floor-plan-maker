export const hexToRgb = (hex) => {
  const value = hex.replace('#', '')
  const normalized = value.length === 3 ? value.split('').map((c) => c + c).join('') : value
  const numeric = Number.parseInt(normalized, 16)
  return { r: (numeric >> 16) & 255, g: (numeric >> 8) & 255, b: numeric & 255 }
}

const bridgeSmallGaps = (mask, width, height, gapSize) => {
  if (!gapSize) return 0
  let bridged = 0
  const bridgeLine = (start, length, stride) => {
    let lastInk = -1
    for (let position = 0; position < length; position += 1) {
      const index = start + position * stride
      if (!mask[index]) continue
      const gap = position - lastInk - 1
      if (lastInk >= 0 && gap > 0 && gap <= gapSize) {
        for (let offset = 1; offset <= gap; offset += 1) {
          const target = start + (lastInk + offset) * stride
          if (!mask[target]) {
            mask[target] = 1
            bridged += 1
          }
        }
      }
      lastInk = position
    }
  }
  for (let y = 0; y < height; y += 1) bridgeLine(y * width, width, 1)
  for (let x = 0; x < width; x += 1) bridgeLine(x, height, width)
  return bridged
}

export function createLineMask(sourceCanvas, sensitivity = 54, gapSize = 0) {
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true })
  const image = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
  const count = sourceCanvas.width * sourceCanvas.height
  const mask = new Uint8Array(count)
  const lineAlpha = new Uint8Array(count)
  const cutoff = 245 - sensitivity * 1.55
  const visualWhitePoint = 248

  for (let index = 0; index < count; index += 1) {
    const offset = index * 4
    const gray = image.data[offset] * 0.299 + image.data[offset + 1] * 0.587 + image.data[offset + 2] * 0.114
    // Keep the visual line layer independent from the binary recognition mask.
    // This preserves the PDF renderer's antialiased edge pixels instead of
    // displaying the harder, lower-fidelity region-detection threshold.
    if (gray < visualWhitePoint) {
      const ink = (visualWhitePoint - gray) / visualWhitePoint
      lineAlpha[index] = Math.round(255 * Math.pow(ink, 0.55))
    }
    if (gray < cutoff) {
      mask[index] = 1
    }
  }
  const bridgedPixels = bridgeSmallGaps(mask, sourceCanvas.width, sourceCanvas.height, gapSize)
  return { mask, lineAlpha, width: sourceCanvas.width, height: sourceCanvas.height, bridgedPixels }
}

export function findClosedRegion({ x, y, mask, width, height, maxPixels = 300_000 }) {
  const seed = y * width + x
  if (mask[seed]) return { status: 'line', pixels: [] }
  const total = width * height
  const visited = new Uint8Array(total)
  const queue = new Int32Array(Math.min(total, maxPixels + 1))
  const pixels = []
  let head = 0
  let tail = 0
  let touchesEdge = false
  queue[tail++] = seed
  visited[seed] = 1

  const visit = (next) => {
    if (!mask[next] && !visited[next] && tail < queue.length) {
      visited[next] = 1
      queue[tail++] = next
    }
  }
  while (head < tail) {
    const current = queue[head++]
    pixels.push(current)
    if (pixels.length >= maxPixels) return { status: 'large', pixels: [] }
    const px = current % width
    const py = (current / width) | 0
    if (px === 0 || py === 0 || px === width - 1 || py === height - 1) touchesEdge = true
    if (px > 0) visit(current - 1)
    if (px + 1 < width) visit(current + 1)
    if (py > 0) visit(current - width)
    if (py + 1 < height) visit(current + width)
  }
  return touchesEdge ? { status: 'open', pixels: [] } : { status: 'closed', pixels }
}

export function countClosedRegions(mask, width, height) {
  const total = width * height
  const visited = new Uint8Array(total)
  const queue = new Int32Array(total)
  let regions = 0
  const minimumArea = Math.max(32, Math.round(total * 0.00003))

  for (let seed = 0; seed < total; seed += 1) {
    if (mask[seed] || visited[seed]) continue
    let head = 0
    let tail = 0
    let area = 0
    let touchesEdge = false
    queue[tail++] = seed
    visited[seed] = 1

    const visit = (next) => {
      if (!mask[next] && !visited[next]) {
        visited[next] = 1
        queue[tail++] = next
      }
    }

    while (head < tail) {
      const current = queue[head++]
      area += 1
      const x = current % width
      const y = (current / width) | 0
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true
      if (x > 0) visit(current - 1)
      if (x + 1 < width) visit(current + 1)
      if (y > 0) visit(current - width)
      if (y + 1 < height) visit(current + width)
    }
    if (!touchesEdge && area >= minimumArea) regions += 1
  }

  return regions
}

export function fillClosedRegion({ x, y, mask, fillData, width, height, color }) {
  const seed = y * width + x
  if (mask[seed]) return { status: 'line' }
  const offset = seed * 4
  const target = [fillData[offset], fillData[offset + 1], fillData[offset + 2], fillData[offset + 3]]
  const rgb = hexToRgb(color)
  if (target[0] === rgb.r && target[1] === rgb.g && target[2] === rgb.b && target[3] === 255) {
    return { status: 'same' }
  }

  const total = width * height
  const visited = new Uint8Array(total)
  const queue = new Int32Array(total)
  const pixels = []
  let head = 0
  let tail = 0
  let touchesEdge = false
  queue[tail++] = seed
  visited[seed] = 1

  const matches = (index) => {
    const i = index * 4
    return !mask[index] && fillData[i] === target[0] && fillData[i + 1] === target[1] && fillData[i + 2] === target[2] && fillData[i + 3] === target[3]
  }

  while (head < tail) {
    const current = queue[head++]
    pixels.push(current)
    const px = current % width
    const py = (current / width) | 0
    if (px === 0 || py === 0 || px === width - 1 || py === height - 1) touchesEdge = true
    if (px > 0) visit(current - 1)
    if (px + 1 < width) visit(current + 1)
    if (py > 0) visit(current - width)
    if (py + 1 < height) visit(current + width)
  }

  if (touchesEdge) return { status: 'open' }
  const before = new Uint8ClampedArray(pixels.length * 4)
  pixels.forEach((pixel, index) => {
    const i = pixel * 4
    before.set(fillData.subarray(i, i + 4), index * 4)
    fillData[i] = rgb.r
    fillData[i + 1] = rgb.g
    fillData[i + 2] = rgb.b
    fillData[i + 3] = 255
  })
  return { status: 'filled', pixels, before }

  function visit(next) {
    if (!visited[next] && matches(next)) {
      visited[next] = 1
      queue[tail++] = next
    }
  }
}
