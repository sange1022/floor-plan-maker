import { useState } from 'react'
import { X } from 'lucide-react'
import { MATERIAL_PRESETS, normalizeMaterial } from '../lib/materials'
import MaterialThumbnail from './MaterialThumbnail'
import FillColorInput from './FillColorInput'

export default function MaterialLibrary({ material, onChoose, onClose }) {
  const [tab, setTab] = useState('texture')
  const [category, setCategory] = useState('all')
  return <div className="material-library" role="dialog" aria-label="建筑材质库">
    <div className="panel-title"><div><strong>建筑材质</strong><small>选择材质，点击区域填充</small></div><button type="button" onClick={onClose} aria-label="关闭材质库"><X size={17} /></button></div>
    <div className="segmented" role="tablist" aria-label="材质类型">
      <button type="button" role="tab" aria-selected={tab === 'solid'} onClick={() => setTab('solid')}>纯色</button>
      <button type="button" role="tab" aria-selected={tab === 'texture'} onClick={() => setTab('texture')}>纹理</button>
    </div>
    {tab === 'solid' ? <div className="library-solid"><FillColorInput color={material.color} onChange={color => onChoose(normalizeMaterial({ color }))} /><p className="canvas-help">也可以从左侧「配色」选择包豪斯、莫兰迪配色。</p></div> : <>
      <select aria-label="纹理分类" value={category} onChange={event => setCategory(event.target.value)}>
        <option value="all">全部建筑纹理</option>
        {[...new Set(MATERIAL_PRESETS.map(preset => preset.category))].map(item => <option key={item}>{item}</option>)}
      </select>
      <div className="material-preset-grid">
        {MATERIAL_PRESETS.filter(preset => category === 'all' || preset.category === category).map(preset => {
          const value = normalizeMaterial({ type: preset.id })
          return <button type="button" key={preset.id} aria-label={preset.name} aria-pressed={material.type === preset.id} onClick={() => onChoose(value)}>
            <MaterialThumbnail material={value} /><span>{preset.name}</span>
          </button>
        })}
      </div>
      <p className="canvas-help">尺寸按图像像素调整；砖纹用于示意铺装，不代表规范墙体剖面。</p>
    </>}
  </div>
}
