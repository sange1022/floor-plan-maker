import { useState } from 'react'
import { Check, Palette } from 'lucide-react'

export const COLOR_PRESETS = [
  { id: 'bauhaus-classic', group: '包豪斯配色', name: '经典原色', colors: ['#D94B3D', '#F2C94C', '#2F5D8C', '#E8E1D4', '#1E1E1C'] },
  { id: 'bauhaus-kandinsky', group: '包豪斯配色', name: '康定斯基', colors: ['#D83A2E', '#F2B705', '#2364AA', '#F1E6CF', '#20201E'] },
  { id: 'bauhaus-dessau', group: '包豪斯配色', name: '德绍建筑', colors: ['#C84335', '#DDAE32', '#315D80', '#B8B6AC', '#272727'] },
  { id: 'bauhaus-geometry', group: '包豪斯配色', name: '现代几何', colors: ['#E4572E', '#F3A712', '#29335C', '#669BBC', '#F6F1E9'] },
  { id: 'bauhaus-print', group: '包豪斯配色', name: '复古印刷', colors: ['#B83A2D', '#D9A928', '#305C7A', '#D8C9B6', '#403A35'] },
  { id: 'morandi-mist', group: '莫兰迪配色', name: '雾感莫兰迪', colors: ['#A8A29E', '#C9B7AD', '#A9B7AA', '#9AAAB8', '#B7A9BE'] },
  { id: 'morandi-warm', group: '莫兰迪配色', name: '暖陶莫兰迪', colors: ['#B98272', '#D2A58F', '#CDBB9D', '#A9A486', '#806C68'] },
  { id: 'morandi-blue', group: '莫兰迪配色', name: '岩蓝莫兰迪', colors: ['#738A99', '#9FB0B8', '#AAB3A2', '#C5B8AF', '#77747D'] },
  { id: 'morandi-forest', group: '莫兰迪配色', name: '森林莫兰迪', colors: ['#71867A', '#94A28A', '#B2AE91', '#9A8374', '#D0C6B8'] },
  { id: 'neutral-gray', group: '基础配色', name: '黑白灰', colors: ['#FFFFFF', '#D9D9D6', '#9B9B97', '#555854', '#1F2221'] },
]

const PRESET_GROUPS = [...new Set(COLOR_PRESETS.map((preset) => preset.group))]

export default function FillColorPresets({ color, onChange }) {
  const [selectedPresetId, setSelectedPresetId] = useState('bauhaus-classic')
  const [open, setOpen] = useState(false)
  const selectedPreset = COLOR_PRESETS.find((preset) => preset.id === selectedPresetId) || COLOR_PRESETS[0]

  return (
    <div className={`palette-rail-control ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="palette-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="left-palette-panel"
      >
        <Palette size={22} strokeWidth={1.7} />
        <span>配色</span>
        <i style={{ background: color }} aria-hidden="true" />
      </button>
      {open ? (
        <div className="palette-flyout" id="left-palette-panel">
          <div className="palette-flyout-heading">
            <strong>配色方案</strong>
            <small>选择一个颜色填充</small>
          </div>
          <select aria-label="选择配色方案" value={selectedPresetId} onChange={(event) => setSelectedPresetId(event.target.value)}>
            {PRESET_GROUPS.map((group) => (
              <optgroup label={group} key={group}>
                {COLOR_PRESETS.filter((preset) => preset.group === group).map((preset) => <option value={preset.id} key={preset.id}>{preset.name}</option>)}
              </optgroup>
            ))}
          </select>
          <div className="vertical-preset-swatches" aria-label={`${selectedPreset.name}的5个颜色`}>
          {selectedPreset.colors.map((presetColor) => {
            const active = color.toUpperCase() === presetColor
            return (
              <button
                type="button"
                className={`vertical-preset-swatch ${active ? 'active' : ''}`}
                style={{ background: presetColor }}
                key={presetColor}
                onClick={() => onChange(presetColor)}
                aria-label={`选择${selectedPreset.name}颜色 ${presetColor}`}
                title={presetColor}
              ><span>{presetColor}</span>
                {active ? <Check size={13} color={['#FFFFFF', '#F6F1E9', '#F1E6CF', '#E8E1D4'].includes(presetColor) ? '#272a2c' : '#fff'} strokeWidth={2.2} /> : null}
              </button>
            )
          })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
