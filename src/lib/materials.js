import { normalizeHex } from './canvasEngine.js'

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
