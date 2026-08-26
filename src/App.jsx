import { useEffect, useRef, useState } from 'react'
import {
  ChevronLeft, ChevronRight, Crop, Download, Eye, EyeOff, FileText, FolderOpen, History as HistoryIcon,
  LocateFixed, MousePointer2, PaintBucket, Redo2, RotateCcw, Save, ScanLine, Trash2,
  Undo2, Upload, ZoomIn, ZoomOut,
} from 'lucide-react'
import EditorCanvas from './components/EditorCanvas'
import AppearanceSettings from './components/AppearanceSettings'
import FillColorPresets from './components/FillColorPresets'
import IconButton from './components/IconButton'
import InspectorSection from './components/InspectorSection'

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

export default function App() {
  const [source, setSource] = useState(null)
  const [documentName, setDocumentName] = useState('花卉线稿_01.png')
  const [tool, setTool] = useState('bucket')
  const [fillColor, setFillColor] = useState('#E8754F')
  const [lineColor, setLineColor] = useState('#1A1A1A')
  const [lineOpacity, setLineOpacity] = useState(100)
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
        fillColor, lineColor, lineOpacity, sensitivity, gapSize, hoverPreview,
        backgroundOpacity, fillLayerOpacities, fillLayerVisibility,
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
      setFillColor(settings.fillColor || '#E8754F')
      setLineColor(settings.lineColor || '#1A1A1A')
      setLineOpacity(settings.lineOpacity ?? 100)
      setSensitivity(settings.sensitivity ?? 54)
      setGapSize(settings.gapSize ?? 1)
      setHoverPreview(settings.hoverPreview !== false)
      setBackground(restoredBackground)
      setBackgroundName(project.background?.name || '')
      setBackgroundOpacity(settings.backgroundOpacity ?? 100)
      setFillLayerOpacities(settings.fillLayerOpacities || {})
      setFillLayerVisibility(settings.fillLayerVisibility || {})
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
    setMessage(`已删除颜色图层 ${color}`)
  }

  const undo = () => setMessage(editorRef.current?.undo() ? '已撤销上一次填色' : '暂无可撤销操作')

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
    const availableWidth = Math.max(280, workspace.clientWidth - 84)
    const availableHeight = Math.max(260, workspace.clientHeight - 84)
    const baseHeight = 700 * canvasSize.height / canvasSize.width
    const nextZoom = Math.max(40, Math.min(100, Math.floor(Math.min(availableWidth / 700, availableHeight / baseHeight) * 100)))
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
            <FillColorPresets color={fillColor} onChange={setFillColor} />
          </nav>
        </aside>

        <section className="workspace" ref={workspaceRef}>
          {message ? <div className={`toast ${busy ? 'busy' : ''}`}><ScanLine size={17} />{message}</div> : null}
          {source ? (
            <EditorCanvas
              ref={editorRef}
              source={source}
              tool={tool}
              fillColor={fillColor}
              lineColor={lineColor}
              lineOpacity={lineOpacity}
              sensitivity={sensitivity}
              gapSize={gapSize}
              hoverPreview={hoverPreview}
              background={background}
              backgroundOpacity={backgroundOpacity}
              fillLayerOpacities={fillLayerOpacities}
              fillLayerVisibility={fillLayerVisibility}
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
              onBackgroundOpacityChange={setBackgroundOpacity}
              onClearBackground={() => { setBackground(null); setBackgroundName(''); setMessage('背景已清除') }}
              onLineColorChange={setLineColor}
              onLineOpacityChange={setLineOpacity}
            />
          </InspectorSection>
          <InspectorSection title="填充颜色">
            <div className="current-color-row">
              <span>当前颜色</span>
              <div className="current-color-control compact">
                <input type="color" value={fillColor} onChange={(event) => setFillColor(event.target.value.toUpperCase())} aria-label="自定义填充颜色" />
                <input value={fillColor} onChange={(event) => /^#[0-9A-Fa-f]{0,6}$/.test(event.target.value) && setFillColor(event.target.value.toUpperCase())} aria-label="填充颜色十六进制值" />
              </div>
            </div>
          </InspectorSection>
          <InspectorSection title={`填色图层${fillLayers.length ? ` (${fillLayers.length})` : ''}`}>
            {fillLayers.length ? (
              <div className="fill-layer-list">
                {fillLayers.map((layer) => {
                  const opacity = fillLayerOpacities[layer.color] ?? 100
                  const visible = fillLayerVisibility[layer.color] !== false
                  const inputId = `layer-${layer.color.slice(1)}`
                  return (
                    <div className="fill-layer" key={layer.color}>
                      <div className="fill-layer-heading">
                        <span className="layer-swatch" style={{ background: layer.color }} />
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
            <button className="full-button center-canvas-button" type="button" onClick={centerCanvas}><LocateFixed size={16} />一键居中画布</button>
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
            <label className="field-label" htmlFor="sensitivity">识别灵敏度 <output>{sensitivity}%</output></label>
            <input id="sensitivity" className="slider" type="range" min="20" max="90" value={sensitivity} onChange={(event) => setSensitivity(Number(event.target.value))} />
            <label className="field-label" htmlFor="gap-size">防漏小缺口 <output>{gapSize === 0 ? '关闭' : `${gapSize}px`}</output></label>
            <input id="gap-size" className="slider" type="range" min="0" max="4" value={gapSize} onChange={(event) => setGapSize(Number(event.target.value))} />
            <label className="toggle-row compact"><span><strong>区域悬停预览</strong><small>填色前显示作用范围</small></span><input type="checkbox" checked={hoverPreview} onChange={(event) => setHoverPreview(event.target.checked)} /></label>
            <button className="full-button" type="button" onClick={() => editorRef.current?.recognize()} disabled={busy}><RotateCcw size={16} />{busy ? '识别中…' : '重新识别'}</button>
          </InspectorSection>
          <InspectorSection title="文档" defaultOpen={false}>
            <div className="row page-row"><span>页面 {page} / {pageCount}</span><div className="stepper"><button type="button" onClick={() => changePage(page - 1)} disabled={page <= 1}><ChevronLeft size={16} /></button><span>{page}</span><button type="button" onClick={() => changePage(page + 1)} disabled={page >= pageCount}><ChevronRight size={16} /></button></div></div>
          </InspectorSection>
        </aside>
      </div>

      <footer className="statusbar">
        <div className="region-status"><ScanLine size={17} /><span>{regionCount} 个区域</span></div>
        <div className="history-controls"><button type="button" onClick={undo} aria-label="撤销"><Undo2 size={19} /></button><button type="button" disabled aria-label="重做"><Redo2 size={19} /></button></div>
        <div className="zoom-controls"><button type="button" onClick={() => setZoom((value) => Math.max(40, value - 10))} aria-label="缩小画布"><ZoomOut size={16} /></button><span>{zoom}%</span><button type="button" onClick={() => setZoom((value) => Math.min(140, value + 10))} aria-label="放大画布"><ZoomIn size={16} /></button><button type="button" onClick={centerCanvas} aria-label="一键居中画布" title="一键居中画布"><LocateFixed size={17} /></button></div>
      </footer>
    </main>
  )
}
