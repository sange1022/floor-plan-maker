import test from 'node:test'
import assert from 'node:assert/strict'
import { MATERIAL_PRESETS, normalizeMaterial, createMaterialState, assignMaterial } from '../src/lib/materials.js'

test('presetCatalog: each architectural preset can create a distinct material', () => {
  const state = createMaterialState(8)
  MATERIAL_PRESETS.forEach((preset, index) => assignMaterial(state, [index], { type: preset.id }))
  assert.equal(Object.keys(state.materials).length, 8)
  assert.equal(new Set(state.assignments).size, 8)
})
test('normalizedInputs: invalid values cannot produce invisible or unbounded textures', () => {
  const value = normalizeMaterial({ color: 'abc', inkColor: 'bad-color', size: Infinity, opacity: -3, textureOpacity: 400, angle: -90 })
  assert.equal(value.color, '#AABBCC')
  assert.equal(value.inkColor, '#766F63')
  assert.equal(value.size, 48)
  assert.equal(value.opacity, 0)
  assert.equal(value.textureOpacity, 100)
  assert.equal(value.angle, 270)
})
test('sameColorDifferentMaterial: equal base colors do not merge unrelated textures', () => {
  const state = createMaterialState(3)
  const a = assignMaterial(state, [0], { type: 'brick', color: '#ccc' })
  const b = assignMaterial(state, [1], { type: 'concrete', color: '#ccc' })
  const c = assignMaterial(state, [2], { type: 'brick', color: '#ccc' })
  assert.notEqual(a, b)
  assert.equal(c, a)
  assert.deepEqual([...state.assignments], [a, b, a])
})
