import test from 'node:test'
import assert from 'node:assert/strict'
import { MATERIAL_PRESETS, normalizeMaterial, createMaterialState, assignMaterial, paintRegion, editMaterial, deleteMaterial } from '../src/lib/materials.js'

test('presetCatalog: each architectural preset can create a distinct material', () => {
  const state = createMaterialState(8)
  MATERIAL_PRESETS.forEach((preset, index) => assignMaterial(state, [index], { type: preset.id }))
  assert.equal(Object.keys(state.materials).length, 8)
  assert.equal(new Set(state.assignments).size, 8)
})

const roomFixture = () => {
  const width = 9, height = 5, mask = new Uint8Array(width * height)
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) if(x===0||x===4||x===8||y===0||y===4)mask[y*width+x]=1
  return {mask,width,height,state:createMaterialState(width*height)}
}
test('sameColorTextureReplacement: bucket replaces a solid by a texture of equal base color', () => {
  const f=roomFixture()
  paintRegion(f.state,{...f,x:2,y:2,material:{color:'#ccc'}})
  const result=paintRegion(f.state,{...f,x:2,y:2,material:{type:'brick',color:'#ccc'}})
  assert.equal(result.status,'filled')
  assert.equal(f.state.materials[f.state.assignments[20]].type,'brick')
})
test('closedGeometryOnly: bucket must not paint a line or region connected to the edge', () => {
  const f=roomFixture()
  assert.equal(paintRegion(f.state,{...f,x:4,y:2,material:{}}).status,'line')
  f.mask[2]=0
  assert.equal(paintRegion(f.state,{...f,x:2,y:2,material:{}}).status,'open')
  assert.ok(f.state.assignments.every(id=>id===0))
})
test('regionScopeIsolation: splitting one room leaves the other room unchanged', () => {
  const f=roomFixture()
  const a=paintRegion(f.state,{...f,x:2,y:2,material:{type:'wood'}})
  paintRegion(f.state,{...f,x:6,y:2,material:{type:'wood'}})
  const b=editMaterial(f.state,a.id,{angle:90},a.pixels)
  assert.notEqual(b,a.id)
  assert.equal(f.state.assignments[24],a.id)
  assert.equal(f.state.materials[a.id].angle,0)
  assert.equal(f.state.materials[b].angle,90)
})
test('removeTextureKeepsColor: local removal preserves base color and other textured room', () => {
  const f=roomFixture()
  const a=paintRegion(f.state,{...f,x:2,y:2,material:{type:'wood',color:'#dcb'}})
  paintRegion(f.state,{...f,x:6,y:2,material:{type:'wood',color:'#dcb'}})
  const b=editMaterial(f.state,a.id,{type:'solid',name:'纯色'},a.pixels)
  assert.equal(f.state.materials[b].color,'#DDCCBB')
  assert.equal(f.state.materials[b].type,'solid')
  assert.equal(f.state.materials[a.id].type,'wood')
  deleteMaterial(f.state,b,a.pixels)
  assert.equal(f.state.assignments[20],0)
  assert.equal(f.state.assignments[24],a.id)
})
test('visibilityAndOpacity: hidden material is not silently reused by new visible paint', () => {
  const f=roomFixture()
  const a=paintRegion(f.state,{...f,x:2,y:2,material:{type:'wood'}})
  editMaterial(f.state,a.id,{visible:false,opacity:0})
  const b=paintRegion(f.state,{...f,x:6,y:2,material:{type:'wood'}})
  assert.notEqual(b.id,a.id)
  assert.equal(f.state.materials[b.id].visible,true)
  assert.equal(f.state.materials[b.id].opacity,100)
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
