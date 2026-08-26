import { Box, Plus, Trash2 } from 'lucide-react'

export const DEFAULT_FILL_SHADOW = {
  color: '#3C302C',
  opacity: 28,
  blur: 14,
  distance: 8,
}

export default function FillShadowSettings({ layers, shadows, onAdd, onChange, onRemove }) {
  if (!layers.length) return <p className="empty-layer-copy">先使用油漆桶填色，再为颜色图层添加独立阴影。</p>

  return (
    <div className="fill-shadow-panel">
      <p className="shadow-intro"><Box size={14} />阴影不会改动填色，可单独调整或移除。</p>
      {layers.map((layer) => {
        const shadow = shadows[layer.color]
        if (!shadow) {
          return (
            <div className="shadow-add-row" key={layer.color}>
              <span className="layer-swatch" style={{ background: layer.color }} />
              <strong>{layer.color}</strong>
              <button type="button" onClick={() => onAdd(layer.color)} aria-label={`给颜色图层 ${layer.color} 添加阴影`}><Plus size={13} />添加阴影</button>
            </div>
          )
        }

        const update = (key, value) => onChange(layer.color, { ...shadow, [key]: value })
        return (
          <div className="shadow-card" key={layer.color}>
            <div className="shadow-card-heading">
              <span className="layer-swatch" style={{ background: layer.color }} />
              <strong>{layer.color}</strong>
              <small>独立效果</small>
              <button type="button" onClick={() => onRemove(layer.color)} aria-label={`移除颜色图层 ${layer.color} 的阴影`}><Trash2 size={14} /></button>
            </div>
            <div className="shadow-color-row">
              <span>阴影颜色</span>
              <label><input type="color" value={shadow.color} onChange={(event) => update('color', event.target.value.toUpperCase())} aria-label={`颜色图层 ${layer.color} 的阴影颜色`} /><b>{shadow.color}</b></label>
            </div>
            <label className="field-label" htmlFor={`shadow-distance-${layer.color.slice(1)}`}>立体深度 <output>{shadow.distance}px</output></label>
            <input id={`shadow-distance-${layer.color.slice(1)}`} className="slider" type="range" min="0" max="32" value={shadow.distance} onChange={(event) => update('distance', Number(event.target.value))} />
            <label className="field-label" htmlFor={`shadow-blur-${layer.color.slice(1)}`}>边缘柔化 <output>{shadow.blur}px</output></label>
            <input id={`shadow-blur-${layer.color.slice(1)}`} className="slider" type="range" min="0" max="40" value={shadow.blur} onChange={(event) => update('blur', Number(event.target.value))} />
            <label className="field-label" htmlFor={`shadow-opacity-${layer.color.slice(1)}`}>阴影透明度 <output>{shadow.opacity}%</output></label>
            <input id={`shadow-opacity-${layer.color.slice(1)}`} className="slider" type="range" min="0" max="80" value={shadow.opacity} onChange={(event) => update('opacity', Number(event.target.value))} />
          </div>
        )
      })}
    </div>
  )
}
