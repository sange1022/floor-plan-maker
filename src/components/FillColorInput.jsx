import { useState } from 'react'
import { normalizeHex } from '../lib/canvasEngine'

export default function FillColorInput({ color, onChange }) {
  const [draft, setDraft] = useState(color)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(false)
  const commit = () => {
    const normalized = normalizeHex(draft)
    if (normalized) {
      onChange(normalized)
      setDraft(normalized)
      setError(false)
    } else {
      setDraft(color)
      setError(true)
    }
    setEditing(false)
  }
  return <div>
    <div className="current-color-row">
      <span>当前颜色</span>
      <div className="current-color-control compact">
        <input type="color" value={color} onChange={(event) => { onChange(event.target.value.toUpperCase()); setError(false) }} aria-label="自定义填充颜色" />
        <input value={editing ? draft : color} spellCheck={false} maxLength={7}
          onFocus={() => { setDraft(color); setEditing(true); setError(false) }}
          onChange={(event) => setDraft(event.target.value)} onBlur={commit}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { setDraft(color); setEditing(false); setError(false) } }}
          aria-label="填充颜色十六进制值" aria-invalid={error} aria-describedby="fill-color-help" />
      </div>
    </div>
    <p id="fill-color-help" className={`canvas-help ${error ? 'color-input-error' : ''}`}>
      {error ? '请输入 3 位或 6 位颜色代码，例如 #ABC 或 #AABBCC；已保留原颜色。' : '选色后自动启用油漆桶；点击围合内部填色，再点可换色。'}
    </p>
  </div>
}
