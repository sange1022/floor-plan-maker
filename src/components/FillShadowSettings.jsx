import { Box, Plus, Trash2 } from 'lucide-react'

export const DEFAULT_FILL_SHADOW = {
  color: '#3C302C',
  opacity: 36,
  angle: -131,
  distance: 300,
  steps: 30,
  stepScale: 1.3,
  blur: 200,
}

const SHADOW_PRESETS = {
  soft: { angle: 45, distance: 22, steps: 14, stepScale: 1.2, blur: 24, opacity: 26 },
  long: { angle: 45, distance: 54, steps: 20, stepScale: 1.3, blur: 38, opacity: 38 },
  solid: { angle: 30, distance: 34, steps: 24, stepScale: 1.05, blur: 3, opacity: 46 },
  plugin: { angle: -131, distance: 300, steps: 30, stepScale: 1.3, blur: 200, opacity: 36 },
}

export default function FillShadowSettings({ layers, shadows, onAdd, onChange, onRemove }) {
  if (!layers.length) return <p className="empty-layer-copy">先使用油漆桶填色，再为颜色图层添加独立阴影。</p>

  return (
    <div className="fill-shadow-panel">
      <p className="shadow-intro"><Box size={14} />多步长阴影：沿角度叠加多层距离与模糊，且不改动填色。</p>
      {layers.map((layer) => {
        const storedShadow = shadows[layer.color]
        if (!storedShadow) {
          return (
            <div className="shadow-add-row" key={layer.color}>
              <span className="layer-swatch" style={{ background: layer.color }} />
              <strong>{layer.color}</strong>
              <button type="button" onClick={() => onAdd(layer.color)} aria-label={`给颜色图层 ${layer.color} 添加阴影`}><Plus size={13} />添加阴影</button>
            </div>
          )
        }
        const shadow = { ...DEFAULT_FILL_SHADOW, ...storedShadow }

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
            <label className="shadow-preset-select">
              <span>快速预设</span>
              <select
                aria-label={`颜色图层 ${layer.color} 的阴影预设`}
                defaultValue=""
                onChange={(event) => {
                  const preset = SHADOW_PRESETS[event.target.value]
                  if (preset) onChange(layer.color, { ...shadow, ...preset })
                  event.target.value = ''
                }}
              >
                <option value="" disabled>选择效果</option>
                <option value="plugin">插件默认</option>
                <option value="soft">柔和立体</option>
                <option value="long">长投影</option>
                <option value="solid">硬边厚度</option>
              </select>
            </label>
            <label className="field-label" htmlFor={`shadow-angle-${layer.color.slice(1)}`}>投影角度 <output>{shadow.angle}°</output></label>
            <input id={`shadow-angle-${layer.color.slice(1)}`} className="slider" type="range" min="-180" max="180" value={shadow.angle} onChange={(event) => update('angle', Number(event.target.value))} />
            <label className="field-label" htmlFor={`shadow-distance-${layer.color.slice(1)}`}>总距离 <output>{shadow.distance}px</output></label>
            <input id={`shadow-distance-${layer.color.slice(1)}`} className="slider" type="range" min="0" max="500" value={shadow.distance} onChange={(event) => update('distance', Number(event.target.value))} />
            <div className="shadow-step-grid">
              <label>
                <span>Steps</span>
                <input type="number" min="1" max="30" value={shadow.steps} aria-label={`颜色图层 ${layer.color} 的阴影步数`} onChange={(event) => update('steps', Math.max(1, Math.min(30, Number(event.target.value))))} />
              </label>
              <label>
                <span>Step Scale</span>
                <input type="number" min="1" max="3" step="0.1" value={shadow.stepScale} aria-label={`颜色图层 ${layer.color} 的阴影步距比例`} onChange={(event) => update('stepScale', Math.max(1, Math.min(3, Number(event.target.value))))} />
              </label>
            </div>
            <label className="field-label" htmlFor={`shadow-blur-${layer.color.slice(1)}`}>边缘柔化 <output>{shadow.blur}px</output></label>
            <input id={`shadow-blur-${layer.color.slice(1)}`} className="slider" type="range" min="0" max="300" value={shadow.blur} onChange={(event) => update('blur', Number(event.target.value))} />
            <label className="field-label" htmlFor={`shadow-opacity-${layer.color.slice(1)}`}>阴影透明度 <output>{shadow.opacity}%</output></label>
            <input id={`shadow-opacity-${layer.color.slice(1)}`} className="slider" type="range" min="0" max="80" value={shadow.opacity} onChange={(event) => update('opacity', Number(event.target.value))} />
          </div>
        )
      })}
    </div>
  )
}
