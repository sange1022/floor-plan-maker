import { normalizeHex, findClosedRegion } from './canvasEngine.js'

export const MATERIAL_PRESETS = [
  { id: 'brick', name: '错缝砖', category: '砖与铺装', color: '#D3B8A4' },
  { id: 'paving', name: '铺地砖', category: '砖与铺装', color: '#D4CDBF' },
  { id: 'wood', name: '木地板', category: '木地板', color: '#D8BE96' },
  { id: 'herringbone', name: '人字拼', category: '木地板', color: '#C5AC87' },
  { id: 'stone', name: '方形石材', category: '石材', color: '#D8D9D2' },
  { id: 'terrazzo', name: '水磨石', category: '石材', color: '#E3DDD2' },
  { id: 'concrete', name: '混凝土', category: '建筑表达', color: '#CFD0CB' },
  { id: 'hatch', name: '45°剖面线', category: '建筑表达', color: '#EAE7DF' },
]
const bounded = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback
export function normalizeMaterial(input = {}) {
  const preset = MATERIAL_PRESETS.find((item) => item.id === input.type)
  return {
    type: preset?.id || 'solid',
    name: String(input.name || preset?.name || '纯色').slice(0, 60),
    color: normalizeHex(input.color) || preset?.color || '#E8754F',
    inkColor: normalizeHex(input.inkColor) || '#766F63',
    size: bounded(input.size, 48, 8, 240),
    angle: ((bounded(input.angle, 0, -36000, 36000) % 360) + 360) % 360,
    textureOpacity: bounded(input.textureOpacity, 45, 0, 100),
    opacity: bounded(input.opacity, 100, 0, 100),
    visible: input.visible !== false,
    shadow: input.shadow ? { ...input.shadow } : null,
    transform: Array.isArray(input.transform) && input.transform.length === 6 && input.transform.every(Number.isFinite)
      ? [...input.transform] : [1, 0, 0, 1, 0, 0],
  }
}
export const createMaterialState = (count) => ({ assignments: new Uint32Array(count), materials: {}, nextId: 1 })
export const cloneMaterialState = (state) => ({ assignments: state.assignments.slice(), materials: structuredClone(state.materials), nextId: state.nextId })
export function assignMaterial(state, pixels, input) {
  const material = normalizeMaterial(input)
  const signature = JSON.stringify(material)
  let id = Number(Object.keys(state.materials).find((key) => JSON.stringify(state.materials[key]) === signature))
  if (!id) {
    id = state.nextId++
    state.materials[id] = material
  }
  for (const pixel of pixels) state.assignments[pixel] = id
  return id
}
export const materialName = (material) => material.type === 'solid' ? `纯色 ${material.color}` : material.name

export function quickFillMaterial(material, autoShadow, layers, fallback) {
  const color = normalizeHex(material.color)
  const existing = layers.find(layer => layer.color === color && layer.shadow)
  return normalizeMaterial({ ...material, shadow: autoShadow ? existing?.shadow || material.shadow || fallback : null })
}

// Change live material effects only; keep their IDs, textures and geometry intact.
export function setColorShadows(state, color, shadow) {
  const wanted = color == null ? null : normalizeHex(color)
  if (color != null && !wanted) return 0
  const live = new Set(state.assignments)
  let changed = 0
  for (const id of live) {
    const material = state.materials[id]
    if (!material || (wanted && material.color !== wanted)) continue
    if (JSON.stringify(material.shadow) === JSON.stringify(shadow)) continue
    material.shadow = shadow ? { ...shadow } : null
    changed++
  }
  return changed
}

export function paintRegion(state, { x, y, mask, width, height, material }) {
  const result = findClosedRegion({ x, y, mask, width, height })
  if (result.status !== 'closed') return result
  const normalized = normalizeMaterial(material)
  const current = state.assignments[y * width + x]
  if (current && result.pixels.every(pixel => state.assignments[pixel] === current)
    && JSON.stringify(state.materials[current]) === JSON.stringify(normalized)) return { ...result, id: current, status: 'same' }
  const id = assignMaterial(state, result.pixels, normalized)
  return { ...result, id, status: 'filled' }
}
export function editMaterial(state, id, patch, pixels) {
  if (!state.materials[id]) return null
  const material = normalizeMaterial({ ...state.materials[id], ...patch })
  if (!pixels) { state.materials[id] = material; return Number(id) }
  // Only split if another region uses this instance. A split gets its own ID
  // even if its parameters match another instance: a local edit stays local.
  const selected = new Set(pixels)
  const shared = state.assignments.some((value, index) => value === Number(id) && !selected.has(index))
  const target = shared ? state.nextId++ : Number(id)
  state.materials[target] = material
  for (const pixel of pixels) state.assignments[pixel] = target
  return target
}
export function deleteMaterial(state, id, pixels) {
  if (!state.materials[id]) return false
  if (pixels) { for (const pixel of pixels) state.assignments[pixel] = 0 }
  else { for (let i = 0; i < state.assignments.length; i++) if (state.assignments[i] === Number(id)) state.assignments[i] = 0 }
  return true
}

export function encodeAssignments(data) {
  const runs = []
  for (let i = 0; i < data.length; i++) {
    const last = runs[runs.length - 1]
    if (last && last[0] === data[i]) last[1]++
    else runs.push([data[i], 1])
  }
  return runs
}
export function decodeAssignments(runs, count) {
  if (!Array.isArray(runs) || !Number.isSafeInteger(count) || count <= 0 || count > 20_000_000) throw new Error('材质像素数据无效')
  const result = new Uint32Array(count)
  let offset = 0
  for (const run of runs) {
    if (!Array.isArray(run) || run.length !== 2) throw new Error('材质数据损坏')
    const [id, length] = run
    if (!Number.isSafeInteger(id) || id < 0 || id > 4294967295 || !Number.isSafeInteger(length) || length <= 0 || offset + length > count) throw new Error('材质数据长度无效')
    result.fill(id, offset, offset + length); offset += length
  }
  if (offset !== count) throw new Error('材质数据不完整')
  return result
}
export function migrateLegacyFill(data, settings = {}) {
  const state = createMaterialState(data.length / 4)
  const colors = new Map()
  for (let pixel = 0; pixel < state.assignments.length; pixel++) {
    const offset = pixel * 4
    if (!data[offset + 3]) continue
    const packed = data[offset] * 65536 + data[offset + 1] * 256 + data[offset + 2]
    if (!colors.has(packed)) {
      const color = `#${packed.toString(16).padStart(6, '0').toUpperCase()}`
      const id = state.nextId++
      state.materials[id] = normalizeMaterial({ color, opacity: settings.fillLayerOpacities?.[color] ?? 100, visible: settings.fillLayerVisibility?.[color] !== false, shadow: settings.fillLayerShadows?.[color] })
      colors.set(packed, id)
    }
    state.assignments[pixel] = colors.get(packed)
  }
  return state
}
export function transformMaterials(state, matrix) {
  const [a, b, c, d, e, f] = matrix
  for (const material of Object.values(state.materials)) {
    const [u, v, w, x, y, z] = material.transform
    material.transform = [a*u+c*v, b*u+d*v, a*w+c*x, b*w+d*x, a*y+c*z+e, b*y+d*z+f].map(value => value === 0 ? 0 : value)
  }
}
export function materialBasePixels(state) {
  const data = new Uint8ClampedArray(state.assignments.length * 4)
  const colors = new Map(Object.entries(state.materials).map(([id, material]) => [Number(id), Number.parseInt(material.color.slice(1), 16)]))
  for (let pixel = 0; pixel < state.assignments.length; pixel++) {
    const id = state.assignments[pixel]
    if (!id) continue
    const color = colors.get(id), offset = pixel * 4
    data[offset] = color >> 16; data[offset+1] = (color >> 8) & 255; data[offset+2] = color & 255; data[offset+3] = 255
  }
  return data
}
