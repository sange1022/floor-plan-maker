import { useRef } from 'react'
import { ImagePlus, ScanLine, X } from 'lucide-react'

export default function AppearanceSettings({
  background, backgroundName, backgroundOpacity, lineColor, lineOpacity,
  onBackgroundImport, onBackgroundOpacityChange, onClearBackground, onLineColorChange, onLineOpacityChange,
}) {
  const backgroundInputRef = useRef(null)

  return (
    <div className="appearance-grid">
      <div className="appearance-card">
        <div className="appearance-card-title"><ImagePlus size={15} /><strong>背景图片</strong></div>
        <input ref={backgroundInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={onBackgroundImport} />
        <button className="appearance-upload" type="button" onClick={() => backgroundInputRef.current?.click()}>
          <ImagePlus size={19} />
          <span>{backgroundName || '上传背景'}</span>
          <small>JPG · PNG · WebP</small>
        </button>
        <div className="appearance-mini-label"><span>透明度</span><output>{background ? `${backgroundOpacity}%` : '—'}</output></div>
        <input className="slider" type="range" min="0" max="100" value={backgroundOpacity} disabled={!background} aria-label="背景透明度" onChange={(event) => onBackgroundOpacityChange(Number(event.target.value))} />
        {background ? <button className="appearance-clear" type="button" onClick={onClearBackground}><X size={12} />清除</button> : null}
      </div>

      <div className="appearance-card">
        <div className="appearance-card-title"><ScanLine size={15} /><strong>线稿样式</strong></div>
        <label className="appearance-color">
          <input type="color" value={lineColor} onChange={(event) => onLineColorChange(event.target.value)} aria-label="线稿颜色" />
          <span>{lineColor.toUpperCase()}</span>
        </label>
        <div className="appearance-mini-label"><span>透明度</span><output>{lineOpacity}%</output></div>
        <input className="slider" type="range" min="10" max="100" value={lineOpacity} aria-label="线稿透明度" onChange={(event) => onLineOpacityChange(Number(event.target.value))} />
        <p className="appearance-note">调整线条色彩，不影响区域识别。</p>
      </div>
    </div>
  )
}
