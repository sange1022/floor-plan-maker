import test from 'node:test'
import assert from 'node:assert/strict'
import { MATERIAL_PRESETS, normalizeMaterial, createMaterialState, assignMaterial, paintRegion, editMaterial, deleteMaterial, cloneMaterialState, encodeAssignments, decodeAssignments, migrateLegacyFill, transformMaterials } from '../src/lib/materials.js'
import { rotatePlane } from '../src/lib/rotatePlane.js'
import { herringbonePlanks } from '../src/lib/materialPatterns.js'
import { findClosedRegion, createLineMask } from '../src/lib/canvasEngine.js'

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

test('projectRoundTrip: assignment runs preserve empty pixels and arbitrary IDs', () => {
  const data=new Uint32Array([0,0,12,12,12,0,300,300])
  assert.deepEqual(encodeAssignments(data),[[0,2],[12,3],[0,1],[300,2]])
  assert.deepEqual(decodeAssignments(JSON.parse(JSON.stringify(encodeAssignments(data))),8),data)
})
test('invalidAssignmentData: corrupt runs cannot overflow or silently truncate', () => {
  for(const runs of [[[1,9]],[[1,-1]],[[1,1.2]],[[1,NaN]],[[0,2]],[[4294967296,8]]])assert.throws(()=>decodeAssignments(runs,8))
})
test('legacyHiddenLayers: opening old RGBA preserves visibility opacity and shadow', () => {
  const state=migrateLegacyFill(new Uint8ClampedArray([170,187,204,255,170,187,204,255,0,0,0,0]),{fillLayerVisibility:{'#AABBCC':false},fillLayerOpacities:{'#AABBCC':32},fillLayerShadows:{'#AABBCC':{angle:33}}})
  assert.deepEqual([...state.assignments],[1,1,0])
  assert.equal(state.materials[1].visible,false)
  assert.equal(state.materials[1].opacity,32)
  assert.equal(state.materials[1].shadow.angle,33)
})
test('undoProperties: cloned history is independent of later parameter edits', () => {
  const state=createMaterialState(4);assignMaterial(state,[0,1],{type:'brick',shadow:{angle:33}})
  const snapshot=cloneMaterialState(state)
  editMaterial(state,1,{angle:90,shadow:{angle:45},visible:false})
  state.assignments[0]=0
  assert.equal(snapshot.materials[1].angle,0)
  assert.equal(snapshot.materials[1].shadow.angle,33)
  assert.equal(snapshot.materials[1].visible,true)
  assert.equal(snapshot.assignments[0],1)
})
test('fourRotations: material assignment and texture basis return exactly to original', () => {
  const state=createMaterialState(6);assignMaterial(state,[0,3],{type:'brick'})
  const before=cloneMaterialState(state)
  let width=3,height=2
  for(let i=0;i<4;i++) {
    state.assignments=rotatePlane(state.assignments,width,height)
    transformMaterials(state,[0,1,-1,0,height,0])
    ;[width,height]=[height,width]
  }
  assert.deepEqual(state,before)
})
test('cropOrigins: cutting 13px left and 8px top preserves texture world coordinates', () => {
  const state=createMaterialState(1);assignMaterial(state,[0],{type:'wood'})
  transformMaterials(state,[1,0,0,1,-13,-8])
  assert.deepEqual(state.materials[1].transform,[1,0,0,1,-13,-8])
})

test('herringboneParquet: each repeating tile cell belongs to exactly one plank', () => {
  const cells=new Uint8Array(36)
  for(const [x,y,w,h] of herringbonePlanks())for(let py=Math.max(0,y);py<Math.min(6,y+h);py++)for(let px=Math.max(0,x);px<Math.min(6,x+w);px++)cells[py*6+px]++
  assert.ok(cells.every(count=>count===1),'herringbone planks must neither overlap nor leave gaps')
})
test('largeClosedRoom: region fill is not capped at 300000 pixels', () => {
  const width=900,height=600,mask=new Uint8Array(width*height)
  for(let x=0;x<width;x++){mask[x]=1;mask[(height-1)*width+x]=1}
  for(let y=0;y<height;y++){mask[y*width]=1;mask[y*width+width-1]=1}
  const result=findClosedRegion({x:30,y:30,mask,width,height})
  assert.equal(result.status,'closed');assert.equal(result.pixels.length,537004)
})
test('gapClosure: recognition bridges a one-pixel break without changing original artwork', () => {
  const width=9,height=9,data=new Uint8ClampedArray(width*height*4);data.fill(255)
  for(let y=2;y<=6;y++)for(let x=2;x<=6;x++)if((x===2||x===6||y===2||y===6)&&!(x===4&&y===2)){const i=(y*width+x)*4;data[i]=data[i+1]=data[i+2]=0}
  const source={width,height,getContext:()=>({getImageData:()=>({data})})}
  const open=createLineMask(source,54,0),closed=createLineMask(source,54,1)
  assert.equal(findClosedRegion({x:4,y:4,...open}).status,'open')
  assert.equal(findClosedRegion({x:4,y:4,...closed}).status,'closed')
  assert.equal(closed.lineAlpha[2*width+4],0)
})
