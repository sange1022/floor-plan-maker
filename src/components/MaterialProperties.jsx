import MaterialThumbnail from './MaterialThumbnail'
import FillColorInput from './FillColorInput'
import { materialName } from '../lib/materials'

export default function MaterialProperties({ material, selection, scope, onScopeChange, onChange, onRemoveTexture, onUse, onDelete }) {
  const textured = material.type !== 'solid'
  const region = selection?.seed != null
  return <div className="material-properties">
    <div className="property-context"><span className="context-dot" />{selection ? region ? '已选区域' : '已选材质图层' : '下一次填充'}</div>
    <div className="current-material"><MaterialThumbnail material={material} /><div><strong>{materialName(material)}</strong><small>{textured ? '建筑纹理 · 无缝重复' : '纯色填充'}</small></div></div>
    {selection ? <>
      <label className="material-field">修改范围<select aria-label="材质修改范围" value={region ? scope : 'material'} onChange={event => onScopeChange(event.target.value)} disabled={!region}>
        <option value="region">仅此区域</option><option value="material">同材质全部区域</option>
      </select></label>
      <p className="canvas-help">{region && scope === 'region' ? '仅调整当前区域，其他房间保持不变。' : '调整这一材质图层的全部区域。'}</p>
    </> : <p className="canvas-help">这些设置用于下一次填充，不会改变已完成的区域。</p>}
    <span className="mini-label">底色</span><FillColorInput color={material.color} onChange={color => onChange({ color })} />
    {textured ? <div className="texture-fields">
      <label className="material-field">纹理大小<span className="value-unit"><input aria-label="纹理大小" type="number" min="8" max="240" value={material.size} onChange={event => onChange({ size: Number(event.target.value) })} />px</span></label>
      <input aria-label="纹理大小滑块" className="slider" type="range" min="8" max="240" value={material.size} onChange={event => onChange({ size: Number(event.target.value) })} />
      <label className="material-field">纹理方向<span className="value-unit"><input aria-label="纹理角度" type="number" min="0" max="359" value={material.angle} onChange={event => onChange({ angle: Number(event.target.value) })} />°</span></label>
      <div className="angle-presets">{[0, 45, 90, 135].map(angle => <button type="button" key={angle} aria-pressed={material.angle === angle} onClick={() => onChange({ angle })}>{angle}°</button>)}</div>
      <label className="material-field">纹理颜色<input type="color" value={material.inkColor} aria-label="纹理颜色" onChange={event => onChange({ inkColor: event.target.value.toUpperCase() })} /></label>
      <label className="field-label" htmlFor="texture-opacity">纹理透明度<output>{material.textureOpacity}%</output></label>
      <input id="texture-opacity" className="slider" type="range" min="0" max="100" value={material.textureOpacity} onChange={event => onChange({ textureOpacity: Number(event.target.value) })} />
      <button className="full-button" type="button" onClick={onRemoveTexture}>移除纹理，保留底色</button>
    </div> : null}
    {selection ? <div className="material-selection-actions"><button className="full-button" type="button" onClick={onUse}>用此材质继续填充</button><button className="text-danger" type="button" onClick={onDelete}>{region && scope === 'region' ? '删除此区域填充' : '删除此材质图层'}</button></div> : null}
  </div>
}
