import { Eye, EyeOff, Trash2, ScanLine } from 'lucide-react'
import MaterialThumbnail from './MaterialThumbnail'

export default function MaterialLayers({ layers, selectedId, onSelect, onChange, onDelete, linePosition, onLinePositionChange }) {
  return <div className="material-layers">
    <div className="line-layer-order"><div className="line-layer-heading"><ScanLine size={16} /><strong>线稿图层</strong><small>{linePosition === 'top' ? '填充上方' : '填充下方'}</small></div>
      <div className="line-order-buttons" role="group" aria-label="线稿图层顺序">
        {[['top', '线稿置顶'], ['bottom', '线稿置底']].map(([value, label]) => <button type="button" key={value} aria-pressed={linePosition === value} onClick={() => onLinePositionChange(value)}>{label}</button>)}
      </div>
    </div>
    <div className="layer-list-heading"><strong>材质图层</strong><span>{layers.length} 层</span></div>
    {layers.length ? [...layers].reverse().map(layer => <div key={layer.id} className={`material-layer ${selectedId === layer.id ? 'selected' : ''} ${layer.visible ? '' : 'muted-layer'}`}>
      <div className="material-layer-top"><button type="button" className="material-layer-select" onClick={() => onSelect(layer)} aria-label={`编辑材质图层 ${layer.name}`}><MaterialThumbnail material={layer} /><span><strong>{layer.name}</strong><small>{layer.regionCount} 个区域 · {layer.color}</small></span></button>
        <button type="button" aria-label={`${layer.visible ? '隐藏' : '显示'}材质图层 ${layer.name}`} onClick={() => onChange(layer.id, { visible: !layer.visible })}>{layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}</button>
        <button type="button" className="text-danger" aria-label={`删除材质图层 ${layer.name}`} onClick={() => onDelete(layer.id)}><Trash2 size={15} /></button>
      </div>
      <label className="field-label" htmlFor={`material-opacity-${layer.id}`}>图层透明度<output>{layer.opacity}%</output></label>
      <input id={`material-opacity-${layer.id}`} aria-label={`材质图层 ${layer.name} 透明度`} className="slider" type="range" min="0" max="100" value={layer.opacity} onChange={event => onChange(layer.id, { opacity: Number(event.target.value) })} />
    </div>) : <p className="empty-layer-copy">选择材质并填充区域后，会自动建立图层。同底色的不同纹理可以分别控制。</p>}
  </div>
}
