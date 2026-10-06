import test from 'node:test'
import assert from 'node:assert/strict'
import * as quick from '../src/lib/materials.js'

test('same-color shadows update solid and hatch without merging or touching other colors', () => {
  const s=quick.createMaterialState(4)
  quick.assignMaterial(s,[0],{color:'#888888'})
  quick.assignMaterial(s,[1],{color:'#888888',type:'hatch'})
  quick.assignMaterial(s,[2],{color:'#FFFFFF'})
  quick.assignMaterial(s,[3],{color:'#888888',type:'brick'})
  quick.deleteMaterial(s,4)
  const before=s.assignments.slice()
  assert.equal(typeof quick.setColorShadows,'function')
  assert.equal(quick.setColorShadows(s,'#888888',{angle:33,opacity:44}),2)
  assert.deepEqual(s.assignments,before)
  assert.equal(s.materials[1].shadow.angle,33)
  assert.equal(s.materials[2].shadow.opacity,44)
  assert.equal(s.materials[3].shadow,null)
  assert.equal(s.materials[4].shadow,null)
  assert.equal(quick.setColorShadows(s,'#888888',{angle:33,opacity:44}),0)
  assert.equal(quick.setColorShadows(s,'#888888',null),2)
})
test('quick fill inherits same-color shadow, supports disabled effects and auto-off',()=>{
  assert.equal(typeof quick.quickFillMaterial,'function')
  const fallback={angle:33,opacity:44}
  const layers=[{color:'#888888',shadow:{angle:70,opacity:22,enabled:false}}]
  assert.equal(quick.quickFillMaterial({color:'#888888',type:'hatch'},true,layers,fallback).shadow.angle,70)
  assert.equal(quick.quickFillMaterial({color:'#888888'},true,layers,fallback).shadow.enabled,false)
  assert.equal(quick.quickFillMaterial({color:'#FFFFFF'},true,layers,fallback).shadow.opacity,44)
  assert.equal(quick.quickFillMaterial({color:'#888888'},false,layers,fallback).shadow,null)
})
