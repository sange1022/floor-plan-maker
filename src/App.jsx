import { useEffect, useRef, useState } from 'react'
import {
  ChevronLeft, ChevronRight, Crop, Download, Eye, EyeOff, FileText, FolderOpen, History as HistoryIcon,
  LocateFixed, MousePointer2, PaintBucket, Redo2, RotateCcw, Save, ScanLine, Trash2,
  Undo2, Upload, ZoomIn, ZoomOut,
} from 'lucide-react'
import EditorCanvas from './components/EditorCanvas'
import AppearanceSettings from './components/AppearanceSettings'
import FillColorPresets from './components/FillColorPresets'
import FillColorInput from './components/FillColorInput'
import FillShadowSettings, { DEFAULT_FILL_SHADOW } from './components/FillShadowSettings'
import IconButton from './components/IconButton'
import InspectorSection from './components/InspectorSection'
import { normalizeHex } from './lib/canvasEngine'

const loadImage = (url) => new Promise((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = reject
  image.src = url
})

const renderPdfPage = async (pdf, pageNumber) => {
  const page = await pdf.getPage(pageNumber)
  const base = page.getViewport({ scale: 1 })
  const targetWidth = 1800
  const maxHeight = 2600
  const renderScale = Math.min(targetWidth / base.width, maxHeight / base.height)
  const viewport = page.getViewport({ scale: renderScale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
  return canvas
}

const loadPdfDocument = async (data) => {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  return pdfjsLib.getDocument({ data }).promise
}

const imageToDataUrl = (image) => {
  if (!image) return null
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  canvas.getContext('2d').drawImage(image, 0, 0)
  return canvas.toDataURL('image/png')
}

const MIN_ZOOM = 10
const MAX_ZOOM = 400
const ZOOM_STEP = 10

export default function App() {
  const [source, setSource] = useState(null)
  const [documentName, setDocumentName] = useState('花卉线稿_01.png')
  const [tool, setTool] = useState('bucket')
  const [fillColor, setFillColor] = useState('#E8754F')
  const [lineColor, setLineColor] = useState('#1A1A1A')
  const [lineOpacity, setLineOpacity] = useState(100)
  const [linePosition, setLinePosition] = useState('top')
  const [sensitivity, setSensitivity] = useState(54)
  const [gapSize, setGapSize] = useState(1)
  const [hoverPreview, setHoverPreview] = useState(true)
  const [regionCount, setRegionCount] = useState(0)
  const [background, setBackground] = useState(null)
  const [backgroundName, setBackgroundName] = useState('')
  const [backgroundOpacity, setBackgroundOpacity] = useState(100)
  const [fillLayers, setFillLayers] = useState([])
  const [fillLayerOpacities, setFillLayerOpacities] = useState({})
  const [fillLayerVisibility, setFillLayerVisibility] = useState({})
  const [fillLayerShadows, setFillLayerShadows] = useState({})
  const [message, setMessage] = useState('正在识别线稿…')
  const [busy, setBusy] = useState(true)
  const [zoom, setZoom] = useState(100)
  const [pdfDocument, setPdfDocument] = useState(null)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [cropRequest, setCropRequest] = useState(null)
  const [activeRatio, setActiveRatio] = useState('free')
  const [historyEntries, setHistoryEntries] = useState([])
  const [currentHistoryId, setCurrentHistoryId] = useState(null)
  const [exportScale, setExportScale] = useState(1)
  const [exportTransparent, setExportTransparent] = useState(false)
  const lineInputRef = useRef(null)
  const projectInputRef = useRef(null)
  const editorRef = useRef(null)
  const workspaceRef = useRef(null)

  const chooseFillColor = (color) => {
    setFillColor(color)
    setTool('bucket')
    setCropRequest(null)
  }
  const selectedLayerInvisible = fillLayerVisibility[fillColor] === false || (fillLayerOpacities[fillColor] ?? 100) === 0
  const revealSelectedLayer = () => {
    setFillLayerVisibility((current) => ({ ...current, [fillColor]: true }))
    if ((fillLayerOpacities[fillColor] ?? 100) === 0) setFillLayerOpacities((current) => ({ ...current, [fillColor]: 100 }))
    setMessage('当前颜色图层已显示，可以继续填色')
  }

  useEffect(() => {
    loadImage(`${import.meta.env.BASE_URL}assets/sample-line-art.png`).then(setSource)
  }, [])

  useEffect(() => {
    if (!message) return undefined
    const timer = window.setTimeout(() => setMessage(''), 2800)
    return () => window.clearTimeout(timer)
  }, [message])

  const importLineArt = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy(true)
    setDocumentName(file.name)
    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const data = await file.arrayBuffer()
        const pdf = await loadPdfDocument(data)
        setPdfDocument(pdf)
        setPage(1)
        setPageCount(pdf.numPages)
        setSource(await renderPdfPage(pdf, 1))
      } else {
        setPdfDocument(null)
        setPage(1)
        setPageCount(1)
        const url = URL.createObjectURL(file)
        setSource(await loadImage(url))
        URL.revokeObjectURL(url)
      }
      setMessage('线稿已导入，正在识别围合区域')
      setFillLayerShadows({})
      setFillLayerOpacities({})
      setFillLayerVisibility({})
      setTool('bucket')
    } catch (error) {
      console.error(error)
      setBusy(false)
      setMessage('文件读取失败，请尝试 PDF、PNG 或 JPG')
    }
    event.target.value = ''
  }

  const changePage = async (nextPage) => {
    if (!pdfDocument || nextPage < 1 || nextPage > pageCount) return
    setBusy(true)
    setPage(nextPage)
    setFillLayerShadows({})
    setFillLayerOpacities({})
    setFillLayerVisibility({})
    setSource(await renderPdfPage(pdfDocument, nextPage))
  }

  const importBackground = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const image = await loadImage(url)
    setBackground(image)
    setBackgroundName(file.name)
    setMessage('背景图片已更换')
    URL.revokeObjectURL(url)
    event.target.value = ''
  }

  const applyBackgroundPreset = async (preset) => {
    try {
      let image
      if (preset.color) {
        const canvas = document.createElement('canvas')
        canvas.width = 8
        canvas.height = 8
        const context = canvas.getContext('2d')
        context.fillStyle = preset.color
        context.fillRect(0, 0, canvas.width, canvas.height)
        image = await loadImage(canvas.toDataURL('image/png'))
      } else {
        image = await loadImage(preset.src)
      }
      setBackground(image)
      setBackgroundName(preset.name)
      setMessage(`背景已切换为「${preset.name}」`)
    } catch (error) {
      console.error(error)
      setMessage('预设背景加载失败，请稍后重试')
    }
  }

  const exportArtwork = () => {
    const url = editorRef.current?.exportPng({ scale: exportScale, transparent: exportTransparent })
    if (!url) return
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${documentName.replace(/\.[^.]+$/, '')}_填色.png`
    anchor.click()
    setMessage(`作品已导出 · ${exportScale}× PNG${exportTransparent ? ' · 透明背景' : ''}`)
  }

  const saveProject = () => {
    const editor = editorRef.current?.exportProjectData()
    if (!editor) return
    const project = {
      version: 1,
      savedAt: new Date().toISOString(),
      documentName,
      editor,
      settings: {
        fillColor, lineColor, lineOpacity, linePosition, sensitivity, gapSize, hoverPreview,
        backgroundOpacity, fillLayerOpacities, fillLayerVisibility, fillLayerShadows,
      },
      background: background ? { name: backgroundName, data: imageToDataUrl(background) } : null,
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(project)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${documentName.replace(/\.[^.]+$/, '')}.weicolor`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage('项目已保存，可稍后继续编辑')
  }

  const openProject = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const project = JSON.parse(await file.text())
      if (project.version !== 1 || !project.editor) throw new Error('Unsupported project')
      const settings = project.settings || {}
      const restoredBackground = project.background?.data ? await loadImage(project.background.data) : null
      setDocumentName(project.documentName || file.name.replace(/\.weicolor$/i, ''))
      setPdfDocument(null)
      setPage(1)
      setPageCount(1)
      setFillColor(normalizeHex(settings.fillColor) || '#E8754F')
      setLineColor(settings.lineColor || '#1A1A1A')
      setLineOpacity(settings.lineOpacity ?? 100)
      setLinePosition(settings.linePosition === 'bottom' ? 'bottom' : 'top')
      setSensitivity(settings.sensitivity ?? 54)
      setGapSize(settings.gapSize ?? 1)
      setHoverPreview(settings.hoverPreview !== false)
      setBackground(restoredBackground)
      setBackgroundName(project.background?.name || '')
      setBackgroundOpacity(settings.backgroundOpacity ?? 100)
      setFillLayerOpacities(settings.fillLayerOpacities || {})
      setFillLayerVisibility(settings.fillLayerVisibility || {})
      setFillLayerShadows(settings.fillLayerShadows || {})
      await editorRef.current?.importProjectData(project.editor, {
        sensitivity: settings.sensitivity ?? 54,
        gapSize: settings.gapSize ?? 1,
      })
      setTool('bucket')
      setMessage('项目已打开，可以继续编辑')
    } catch (error) {
      console.error(error)
      setBusy(false)
      setMessage('项目文件无法打开，请确认是 .weicolor 文件')
    }
    event.target.value = ''
  }

  const deleteFillLayer = (color) => {
    if (!editorRef.current?.deleteLayer(color)) return
    setFillLayerOpacities((current) => { const next = { ...current }; delete next[color]; return next })
    setFillLayerVisibility((current) => { const next = { ...current }; delete next[color]; return next })
    setFillLayerShadows((current) => { const next = { ...current }; delete next[color]; return next })
    setMessage(`已删除颜色图层 ${color}`)
  }

  const currentHistoryIndex = historyEntries.findIndex((entry) => entry.id === currentHistoryId)
  const canUndo = currentHistoryIndex > 0
  const canRedo = currentHistoryIndex >= 0 && currentHistoryIndex < historyEntries.length - 1
  const activeShadowCount = fillLayers.filter((layer) => fillLayerShadows[layer.color]).length

  const undo = () => setMessage(editorRef.current?.undo() ? '已撤销上一次修改' : '暂无可撤销操作')
  const redo = () => setMessage(editorRef.current?.redo() ? '已重做下一次修改' : '暂无可重做操作')

  const tools = [
    { id: 'select', label: '选择', icon: MousePointer2 },
    { id: 'bucket', label: '油漆桶', icon: PaintBucket },
    { id: 'crop', label: '裁剪', icon: Crop },
  ]

  const cropRatios = [
    { id: 'free', label: '自由', ratio: null },
    { id: 'current', label: '原比例', ratio: canvasSize.height ? canvasSize.width / canvasSize.height : null },
    { id: '1:1', label: '1:1', ratio: 1 },
    { id: '4:3', label: '4:3', ratio: 4 / 3 },
    { id: '3:4', label: '3:4', ratio: 3 / 4 },
    { id: '16:9', label: '16:9', ratio: 16 / 9 },
    { id: '9:16', label: '9:16', ratio: 9 / 16 },
    { id: 'a4', label: 'A4', ratio: 210 / 297 },
  ]

  const startCrop = (id, ratio) => {
    setActiveRatio(id)
    setTool('crop')
    setCropRequest({ id, ratio, key: Date.now() })
    setMessage(ratio ? `已按 ${cropRatios.find((item) => item.id === id)?.label} 建立裁剪框` : '拖动画布，自由选择保留区域')
  }

  const centerCanvas = () => {
    const workspace = workspaceRef.current
    if (!workspace || !canvasSize.width || !canvasSize.height) return
    const nextZoom = 200
    setZoom(nextZoom)
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      workspace.scrollTo({
        left: Math.max(0, (workspace.scrollWidth - workspace.clientWidth) / 2),
        top: Math.max(0, (workspace.scrollHeight - workspace.clientHeight) / 2),
        behavior: 'smooth',
      })
    }))
    setMessage(`画布已居中 · ${nextZoom}%`)
  }

  const fitCanvas = () => {
    const workspace = workspaceRef.current
    if (!workspace || !canvasSize.width || !canvasSize.height) return
    const styles = getComputedStyle(workspace)
    const availableWidth = workspace.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight)
    const availableHeight = workspace.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom)
    const scale = Math.min(availableWidth / 700, availableHeight / (700 * canvasSize.height / canvasSize.width))
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.floor(scale * 100))))
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => workspace.scrollTo({ left: 0, top: 0 })))
    setMessage('已完整显示画布，可继续放大查看细节')
  }

  const restoreHistory = (id) => {
    if (!editorRef.current?.restoreHistory(id)) return
    setTool('bucket')
    const entry = historyEntries.find((item) => item.id === id)
    setMessage(`已恢复：${entry?.label || '历史状态'}`)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
          <div className="brand" aria-label="平面图制作"><span>平</span><span>面图制作</span></div>
        <div className="document-title"><FileText size={18} strokeWidth={1.7} /><span>{documentName}</span></div>
        <div className="top-actions">
          <button className="button secondary project-button" type="button" onClick={() => projectInputRef.current?.click()}><FolderOpen size={17} />打开项目</button>
          <button className="button secondary project-button" type="button" onClick={saveProject}><Save size={17} />保存项目</button>
          <button className="button secondary" type="button" onClick={() => lineInputRef.current?.click()}><Upload size={17} />导入线稿</button>
          <button className="button primary" type="button" onClick={exportArtwork}><Download size={17} />导出作品</button>
        </div>
        <input ref={lineInputRef} hidden type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={importLineArt} />
        <input ref={projectInputRef} hidden type="file" accept=".weicolor,application/json" onChange={openProject} />
      </header>

      <div className="editor-grid">
        <aside className="left-panel">
          <nav className="tool-rail" aria-label="绘图工具">
            {tools.map((item) => <IconButton key={item.id} {...item} active={tool === item.id} onClick={() => setTool(item.id)} />)}
            <FillColorPresets color={fillColor} onChange={chooseFillColor} />
          </nav>
        </aside>

        <section className="preview-pane" aria-label="画布预览区">
          <div className="canvas-floating-controls">
            <div className="canvas-history-controls" aria-label="历史操作">
              <button type="button" onClick={undo} disabled={!canUndo} aria-label="撤销"><Undo2 size={17} /></button>
              <button type="button" onClick={redo} disabled={!canRedo} aria-label="重做"><Redo2 size={17} /></button>
            </div>
            <div className="canvas-view-controls">
              <button className="canvas-fit-control" type="button" onClick={fitCanvas} aria-label="完整显示画布"><ScanLine size={16} /><span>完整显示</span></button>
              <button className="canvas-center-control" type="button" onClick={centerCanvas} aria-label="一键居中并放大到200%"><LocateFixed size={16} /><span>一键居中 · 200%</span></button>
            </div>
          </div>
          <div className="workspace" ref={workspaceRef}>
            {message ? <div className={`toast ${busy ? 'busy' : ''}`} role="status"><ScanLine size={17} />{message}</div> : null}
            {source ? (
              <EditorCanvas
              ref={editorRef}
              source={source}
              tool={tool}
              fillColor={fillColor}
              busy={busy}
              lineColor={lineColor}
              lineOpacity={lineOpacity}
              linePosition={linePosition}
              sensitivity={sensitivity}
              gapSize={gapSize}
              hoverPreview={hoverPreview}
              background={background}
              backgroundOpacity={backgroundOpacity}
              fillLayerOpacities={fillLayerOpacities}
              fillLayerVisibility={fillLayerVisibility}
              fillLayerShadows={fillLayerShadows}
              zoom={zoom}
              cropRequest={cropRequest}
              onRegions={setRegionCount}
              onLayersChange={setFillLayers}
              onMessage={setMessage}
              onBusy={setBusy}
              onCanvasSize={(size) => setCanvasSize(size)}
              onCropApplied={() => { setTool('bucket'); setMessage('裁剪完成，画布与识别区域已更新') }}
              onCropCancel={() => setTool('bucket')}
              onHistoryChange={(entries, activeId) => { setHistoryEntries(entries); setCurrentHistoryId(activeId) }}
              />
            ) : null}
          </div>
        </section>

        <aside className="inspector">
          <InspectorSection title="画面设置">
            <AppearanceSettings
              background={background}
              backgroundName={backgroundName}
              backgroundOpacity={backgroundOpacity}
              lineColor={lineColor}
              lineOpacity={lineOpacity}
              onBackgroundImport={importBackground}
              onBackgroundPreset={applyBackgroundPreset}
              onBackgroundOpacityChange={setBackgroundOpacity}
              onClearBackground={() => { setBackground(null); setBackgroundName(''); setMessage('背景已清除') }}
              onLineColorChange={setLineColor}
              onLineOpacityChange={setLineOpacity}
            />
          </InspectorSection>
          <InspectorSection title="填充颜色">
            <FillColorInput color={fillColor} onChange={chooseFillColor} />
            {selectedLayerInvisible ? <div className="fill-visibility-notice" role="status">
              <span>当前颜色图层已隐藏或透明度为 0%，填色后也不可见。</span>
              <button type="button" onClick={revealSelectedLayer}>显示当前颜色图层</button>
            </div> : null}
          </InspectorSection>
          <InspectorSection title={`填色图层${fillLayers.length ? ` (${fillLayers.length})` : ''}`}>
            <div className="line-layer-order">
              <div className="line-layer-heading"><ScanLine size={16} /><strong>线稿图层</strong><small>{linePosition === 'top' ? '位于填色上方' : '位于填色下方'}</small></div>
              <div className="line-order-buttons" role="group" aria-label="线稿图层顺序">
                {[{ value: 'top', label: '线稿置顶' }, { value: 'bottom', label: '线稿置底' }].map((item) => (
                  <button key={item.value} type="button" aria-pressed={linePosition === item.value}
                    onClick={() => { setLinePosition(item.value); setMessage(`${item.label}，填色和导出按新顺序显示`) }}>{item.label}</button>
                ))}
              </div>
              <p className="line-stack-description">从上到下：{linePosition === 'top' ? '线稿 → 填色与阴影 → 背景' : '填色与阴影 → 线稿 → 背景'}</p>
            </div>
            {fillLayers.length ? (
              <div className="fill-layer-list">
                {fillLayers.map((layer) => {
                  const opacity = fillLayerOpacities[layer.color] ?? 100
                  const visible = fillLayerVisibility[layer.color] !== false
                  const inputId = `layer-${layer.color.slice(1)}`
                  return (
                    <div className="fill-layer" key={layer.color}>
                      <div className="fill-layer-heading">
                        <button type="button" className="layer-swatch" style={{ background: layer.color }} aria-label={`使用图层颜色 ${layer.color} 填色`} onClick={() => chooseFillColor(layer.color)} />
                        <strong>{layer.color}</strong>
                        <span>{layer.regionCount} 个区域</span>
                        <button
                          className={`layer-visibility ${visible ? '' : 'hidden'}`}
                          type="button"
                          aria-label={`${visible ? '隐藏' : '显示'}颜色图层 ${layer.color}`}
                          aria-pressed={!visible}
                          onClick={() => setFillLayerVisibility((current) => ({ ...current, [layer.color]: !visible }))}
                        >
                          {visible ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>
                        <button className="layer-delete" type="button" aria-label={`删除颜色图层 ${layer.color}`} onClick={() => deleteFillLayer(layer.color)}><Trash2 size={14} /></button>
                      </div>
                      <div className="field-label">
                        <label htmlFor={inputId}>图层透明度</label>
                        <label className="opacity-number"> <input
                          type="number"
                          min="0"
                          max="100"
                          value={opacity}
                          disabled={!visible}
                          aria-label={`颜色图层 ${layer.color} 透明度`}
                          onChange={(event) => setFillLayerOpacities((current) => ({
                            ...current,
                            [layer.color]: Math.max(0, Math.min(100, Number(event.target.value))),
                          }))}
                        /><span>%</span></label>
                      </div>
                      <input
                        id={inputId}
                        className="slider"
                        type="range"
                        min="0"
                        max="100"
                        value={opacity}
                        disabled={!visible}
                        onChange={(event) => setFillLayerOpacities((current) => ({ ...current, [layer.color]: Number(event.target.value) }))}
                      />
                    </div>
                  )
                })}
              </div>
            ) : <p className="empty-layer-copy">使用油漆桶填色后，同色区域会自动归入一个图层。</p>}
          </InspectorSection>
          <InspectorSection title={`立体阴影${activeShadowCount ? ` (${activeShadowCount})` : ''}`}>
            <FillShadowSettings
              layers={fillLayers}
              shadows={fillLayerShadows}
              onAdd={(color) => {
                setFillLayerShadows((current) => ({ ...current, [color]: { ...DEFAULT_FILL_SHADOW } }))
                setMessage(`已为 ${color} 添加独立阴影`)
              }}
              onChange={(color, shadow) => setFillLayerShadows((current) => ({ ...current, [color]: shadow }))}
              onRemove={(color) => {
                setFillLayerShadows((current) => { const next = { ...current }; delete next[color]; return next })
                setMessage(`已移除 ${color} 的阴影，填色保持不变`)
              }}
            />
          </InspectorSection>
          <InspectorSection title="画布设置">
            <div className="canvas-size-row">
              <span>当前画布</span>
              <strong>{canvasSize.width || '—'} × {canvasSize.height || '—'} px</strong>
            </div>
            <p className="canvas-help">选择常用比例后，可在画面中拖动重新确定裁剪范围。</p>
            <div className="ratio-grid" aria-label="常用画布比例">
              {cropRatios.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={tool === 'crop' && activeRatio === item.id ? 'active' : ''}
                  onClick={() => startCrop(item.id, item.ratio)}
                >
                  <span className={`ratio-shape ratio-${item.id.replace(':', '-')}`} />
                  {item.label}
                </button>
              ))}
            </div>
          </InspectorSection>
          <InspectorSection title={`历史记录${historyEntries.length ? ` (${historyEntries.length})` : ''}`}>
            {historyEntries.length ? (
              <div className="history-list">
                {[...historyEntries].reverse().map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={entry.id === currentHistoryId ? 'active' : ''}
                    onClick={() => restoreHistory(entry.id)}
                    aria-pressed={entry.id === currentHistoryId}
                  >
                    <span className="history-icon"><HistoryIcon size={14} /></span>
                    <span><strong>{entry.label}</strong><small>{entry.time}</small></span>
                  </button>
                ))}
              </div>
            ) : <p className="empty-layer-copy">完成一次填色或裁剪后，这里会生成可恢复的记录。</p>}
          </InspectorSection>
          <InspectorSection title="导出设置" defaultOpen={false}>
            <span className="mini-label">导出清晰度</span>
            <div className="export-scale-options">
              {[1, 2].map((scale) => <button key={scale} type="button" className={exportScale === scale ? 'active' : ''} onClick={() => setExportScale(scale)}>{scale}×<small>{scale === 1 ? '原始尺寸' : '高清放大'}</small></button>)}
            </div>
            <label className="toggle-row"><span><strong>透明背景</strong><small>不输出白色底板</small></span><input type="checkbox" checked={exportTransparent} onChange={(event) => setExportTransparent(event.target.checked)} /></label>
            <button className="full-button" type="button" onClick={exportArtwork}><Download size={15} />按当前设置导出</button>
          </InspectorSection>
          <InspectorSection title="识别区域" defaultOpen={false}>
            <div className="recognition-result"><ScanLine size={19} /><span>已识别 <b>{regionCount}</b> 个围合区域</span></div>
            <label className="field-label" htmlFor="sensitivity">线条筛选强度 <output>{sensitivity}%</output></label>
            <input id="sensitivity" className="slider" type="range" min="20" max="90" value={sensitivity} onChange={(event) => setSensitivity(Number(event.target.value))} />
            <label className="field-label" htmlFor="gap-size">防漏小缺口 <output>{gapSize === 0 ? '关闭' : `${gapSize}px`}</output></label>
            <input id="gap-size" className="slider" type="range" min="0" max="12" value={gapSize} onChange={(event) => setGapSize(Number(event.target.value))} />
            <p className="canvas-help">浅灰细线漏色时降低筛选强度；线条有断口时增大防漏值。调整后点击重新识别，已有填色会保留，也可撤销。</p>
            <label className="toggle-row compact"><span><strong>区域悬停预览</strong><small>填色前显示作用范围</small></span><input type="checkbox" checked={hoverPreview} onChange={(event) => setHoverPreview(event.target.checked)} /></label>
            <button className="full-button" type="button" onClick={() => editorRef.current?.recognize()} disabled={busy}><RotateCcw size={16} />{busy ? '识别中…' : '重新识别'}</button>
          </InspectorSection>
          <InspectorSection title="文档" defaultOpen={false}>
            <div className="row page-row"><span>页面 {page} / {pageCount}</span><div className="stepper"><button type="button" onClick={() => changePage(page - 1)} disabled={page <= 1}><ChevronLeft size={16} /></button><span>{page}</span><button type="button" onClick={() => changePage(page + 1)} disabled={page >= pageCount}><ChevronRight size={16} /></button></div></div>
          </InspectorSection>
        </aside>
      </div>

      <footer className="statusbar">
        <div className="region-status"><ScanLine size={17} /><span>{regionCount} 个区域</span><span className="active-tool-status">{busy ? '处理中…' : tool === 'bucket' ? `油漆桶 · ${fillColor}` : tool === 'crop' ? '裁剪 · 应用后生效' : '选择 · 选色开始填充'}</span></div>
        <div className="zoom-controls"><button type="button" onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))} aria-label="缩小画布"><ZoomOut size={16} /></button><span>{zoom}%</span><button type="button" onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))} aria-label="放大画布"><ZoomIn size={16} /></button></div>
      </footer>
    </main>
  )
}
