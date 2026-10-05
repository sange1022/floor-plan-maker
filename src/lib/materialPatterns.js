import { normalizeMaterial } from './materials.js'

const tileCache = new Map()
export function createPatternTile(input) {
  const material = normalizeMaterial(input)
  const key = `${material.type}:${material.inkColor}`
  if (tileCache.has(key)) return tileCache.get(key)
  const tile = document.createElement('canvas')
  tile.width = tile.height = 192
  const ctx = tile.getContext('2d')
  ctx.strokeStyle = ctx.fillStyle = material.inkColor
  ctx.lineWidth = 1.6
  const line = (x, y, a, b) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(a, b); ctx.stroke() }
  const random = (() => { let seed = 1729; return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 } })()
  switch (material.type) {
    case 'brick':
      for (let y = 0; y <= 192; y += 48) {
        line(0, y, 192, y)
        const shift = (y / 48) % 2 * 48
        for (let x = shift; x <= 192; x += 96) line(x, y, x, y + 48)
      }
      break
    case 'paving':
      for (let y = 0; y < 192; y += 96) for (let x = 0; x < 192; x += 96) {
        if ((x + y) % 192 === 0) {
          ctx.strokeRect(x, y, 96, 96); line(x + 48, y, x + 48, y + 96)
        } else { ctx.strokeRect(x, y, 96, 96); line(x, y + 48, x + 96, y + 48) }
      }
      break
    case 'wood':
      for (let y = 0; y < 192; y += 48) {
        line(0, y, 192, y)
        line((y / 48 % 2) * 96, y, (y / 48 % 2) * 96, y + 48)
        ctx.save(); ctx.globalAlpha = 0.28
        for (let k = 1; k < 4; k++) line(8, y + k * 10, 180, y + k * 10 + 3)
        ctx.restore()
      }
      break
    case 'herringbone':
      // A periodic parquet block, rotated 45° in the pattern transform.
      for (let y = -192; y <= 384; y += 24) for (let x = -192; x <= 384; x += 24) {
        const phase = ((x / 24 + y / 24) % 4 + 4) % 4
        if (phase === 0) ctx.strokeRect(x, y, 72, 24)
        if (phase === 3) ctx.strokeRect(x, y, 24, 72)
      }
      break
    case 'stone':
      for (let i = 0; i <= 192; i += 96) { line(i, 0, i, 192); line(0, i, 192, i) }
      ctx.save(); ctx.globalAlpha = 0.15
      for (let i = 0; i < 28; i++) { const x = random() * 192; const y = random() * 192; line(x, y, x + 6, y + 3) }
      ctx.restore()
      break
    case 'terrazzo':
      for (let i = 0; i < 95; i++) {
        const x = 8 + random() * 176; const y = 8 + random() * 176; const size = 2 + random() * 5
        ctx.globalAlpha = 0.35 + random() * 0.65
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + size, y - 2); ctx.lineTo(x + size * 1.3, y + size); ctx.lineTo(x - 1, y + size * 0.6); ctx.closePath(); ctx.fill()
      }
      ctx.globalAlpha = 1
      break
    case 'concrete':
      for (let i = 0; i < 450; i++) {
        ctx.globalAlpha = 0.1 + random() * 0.6
        ctx.fillRect(random() * 192, random() * 192, 0.7 + random() * 1.4, 0.7 + random() * 1.4)
      }
      ctx.globalAlpha = 1
      for (let i = 0; i < 12; i++) { const x = random() * 180; const y = random() * 180; line(x, y, x + 3, y + 4); line(x + 3, y + 4, x + 5, y) }
      break
    case 'hatch':
      for (let i = -192; i <= 192; i += 24) line(i, 192, i + 192, 0)
      break
  }
  if (tileCache.size > 48) tileCache.delete(tileCache.keys().next().value)
  tileCache.set(key, tile)
  return tile
}

export function paintMaterial(context, input, width, height) {
  const material = normalizeMaterial(input)
  context.fillStyle = material.color
  context.fillRect(0, 0, width, height)
  if (material.type === 'solid' || material.textureOpacity === 0) return
  const pattern = context.createPattern(createPatternTile(material), 'repeat')
  const transform = new DOMMatrix(material.transform)
    .rotate(material.angle + (material.type === 'herringbone' ? 45 : 0)).scale(material.size / 96)
  pattern.setTransform(transform)
  context.save()
  context.globalAlpha = material.textureOpacity / 100
  context.fillStyle = pattern
  context.fillRect(0, 0, width, height)
  context.restore()
}

// Builds each geometry mask once. Textures never become recognition boundaries.
export function renderMaterialFill(context, state, width, height) {
  context.clearRect(0, 0, width, height)
  const masks = new Map()
  for (let pixel = 0; pixel < state.assignments.length; pixel++) {
    const id = state.assignments[pixel]
    const material = state.materials[id]
    if (!material || !material.visible || material.opacity === 0) continue
    if (!masks.has(id)) masks.set(id, new ImageData(width, height))
    const image = masks.get(id).data
    const offset = pixel * 4
    image[offset] = image[offset + 1] = image[offset + 2] = image[offset + 3] = 255
  }
  const layer = document.createElement('canvas')
  layer.width = width; layer.height = height
  const layerCtx = layer.getContext('2d')
  for (const [id, image] of masks) {
    layerCtx.putImageData(image, 0, 0)
    layerCtx.save()
    layerCtx.globalCompositeOperation = 'source-in'
    // Draw a complete texture then clip as a single object; otherwise the
    // semi-transparent strokes would replace, rather than overlay, the base.
    const patternCanvas = document.createElement('canvas')
    patternCanvas.width = width; patternCanvas.height = height
    paintMaterial(patternCanvas.getContext('2d'), state.materials[id], width, height)
    layerCtx.drawImage(patternCanvas, 0, 0)
    layerCtx.restore()
    context.save(); context.globalAlpha = state.materials[id].opacity / 100
    context.drawImage(layer, 0, 0); context.restore()
  }
  return masks
}
