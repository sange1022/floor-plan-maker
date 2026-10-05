# 建筑材质填充 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 增加8种可编辑的建筑纹理，保留稳定的油漆桶和已有作品，并减少右侧设置翻找。

**Architecture:** 原始线稿掩码继续唯一决定围合区域；新增 Uint32Array 材质归属平面和独立材质实例，渲染时用区域掩码裁切程序化图案。历史和项目同时保存归属与材质设置；图层透明度、可见性与阴影从颜色键迁移为实例键。

**Tech Stack:** 现有 React/Vite/Canvas 2D、Node内置 test runner；浏览器测试使用可用的Playwright运行时，不新增在线服务。

**Spec:** `docs/superpowers/specs/2026-10-05-architectural-materials-design.md`

## Global Constraints

- 第一版8种：错缝砖、铺地砖、木地板、人字拼、方形石材、水磨石、混凝土、45°剖面线；纯色保留。
- 参数：尺寸（图像像素）、角度、底色、纹理色、纹理透明度；材质整体透明度另设。
- 同底色不同材质互不联动，默认仅此区域，可明确修改整组。
- 图案不写入识别掩码，开放区域禁止填充，移除纹理保留底色。
- 保留苹果系统字体、背景、PDF分页、线稿上下层、阴影、裁切、旋转和10–400%缩放。
- 旧项目可打开，新项目不依赖网络材质；1x/2x普通及透明导出与预览一致。
- 只交付本地测试版本，不自动推送部署。

## Review Focus

- 同色材质替换不能误判为“已经填过”；Task 2测试相同底色替换纹理。
- 防漏调整将原区域合并时，已有多种材质不能被清空；Task 3测试重识别保留归属。
- 仅修改一个房间不能连带修改同材质其它房间；Task 2测试实例拆分。
- 四次旋转和裁切后的图案不能错位，撤回必须恢复方向与原点；Task 3测试归属与图案变换。
- 旧项目隐藏/透明层必须转换而非丢失；Task 3测试旧格式设置迁移。

## 文件边界

- `src/lib/materials.js`：预设、参数规范化、实例分配/分离、旧格式迁移、归属编码。
- `src/lib/materialPatterns.js`：程序化无缝图案、图案缓存及材质掩码渲染。
- `src/components/MaterialLibrary.jsx`、`MaterialProperties.jsx`、`MaterialLayers.jsx`：库、选中属性、图层管理。
- `src/components/EditorCanvas.jsx`：区域点击、选中、渲染集成、历史、几何变换、导入导出。
- `src/App.jsx`：材质选择和面板组织；保留现有作品级设置。
- `src/components/FillShadowSettings.jsx`：支持实例ID和材质名称，不只按色号操作。
- `src/styles.css`：材质面板、属性/图层切换与响应式。
- `tests/materials.test.mjs`、`tests/material-browser.mjs`：状态/几何单测和浏览器回归。

### Task 1: 材质状态与无缝图案

**Files:** Create `src/lib/materials.js`, `src/lib/materialPatterns.js`, `tests/materials.test.mjs`; Modify `package.json`.

**Interfaces:**
- `MATERIAL_PRESETS`: 8个 `{id, name, category}`；另有纯色类型 `solid`。
- `normalizeMaterial(input) -> {type, color, inkColor, size, angle, textureOpacity, opacity, visible, shadow, originX, originY}`，颜色规范化，尺寸8–240px，角度0–359，透明度0–100。
- `createMaterialState(pixelCount) -> {assignments: Uint32Array, materials: Object, nextId: number}`；ID 0为空白。
- `assignMaterial(state, pixels, material) -> materialId`：相同有效参数复用实例，隐藏或透明度0的实例不能被无提示复用。
- `createPatternTile(material) -> HTMLCanvasElement`、`renderMaterialFill(ctx, state, width, height)`：相同参数缓存图案，按实例掩码裁切，不接触识别数据。

- [x] 写失败单测 `presetCatalog`、`normalizedInputs`、`sameColorDifferentMaterial`：预设数8、类型唯一、非法颜色回退、透明度钳制、同色砖/混凝土不同ID。
- [x] 运行 `node --test tests/materials.test.mjs`，确认模块缺失导致失败。
- [x] 实现以上状态接口和8种图案；随机斑点使用固定种子，保证重开项目图案不变。
- [x] 运行单测；浏览器生成八种图案，验证无空白图案且砖/网格重复边界连续。
- [x] 提交 `feat: add architectural material model and pattern presets`。

### Task 2: 材质油漆桶与选区编辑

**Files:** Modify `src/components/EditorCanvas.jsx`, `src/lib/materials.js`; Test `tests/materials.test.mjs`, `tests/material-browser.mjs`.

**Interfaces:**
- Editor新增props `activeMaterial`, `onMaterialStateChange(layers)`, `onSelectionChange(selection)`；selection包含选区seed与materialId，无选区为null。
- Editor ref新增 `updateMaterial(id, patch, {scope:'region'|'material', seed})`, `removeTexture(id, options)`, `deleteMaterial(id, options)`。
- `onMaterialStateChange`输出 `{id, name, regionCount, ...materialSettings}`；后续UI只使用实例ID操作。
- `findClosedRegion`保留现有接口及closed/open/line状态，选择工具点击闭合区域选中而非填色。

- [x] 写失败测试 `sameColorTextureReplacement`、`closedGeometryOnly`、`regionScopeIsolation`、`removeTextureKeepsColor`、`visibilityAndOpacity`：同底色替换成功、开放/线条不变、单区域编辑不影响另一房间、移除纹理保留RGB、隐藏填充提示可恢复。
- [x] 运行测试确认新接口未实现导致失败。
- [x] 集成原几何遍历与材质归属；不再靠RGB判断材质相同；实现选中和局部拆分、整组编辑及删除。
- [x] 渲染材质后按原层级组合；按材质轮廓计算独立阴影，悬停保持独立覆盖画布。
- [x] 运行状态单测与浏览器测试确认上述行为，提交 `feat: paint and edit region materials independently`。

### Task 3: 历史、旋转裁切与项目格式

**Files:** Modify `src/components/EditorCanvas.jsx`, `src/App.jsx`, `src/lib/materials.js`; Test上述两测试文件。

**Interfaces:**
- `.weicolor`顶层版本升为2；Editor项目数据新增 `materialState:{materials,nextId,assignments}`。
- `encodeAssignments(Uint32Array) -> Array<[id,runLength]>`、`decodeAssignments(runs,pixelCount) -> Uint32Array`：校验长度、整数、材质引用，非法文件返回可理解错误，不静默裁剪。
- `migrateLegacyFill(fillData, settings) -> materialState`：RGBA alpha非0像素按色号转换，迁移旧颜色键透明度、显示和阴影；未知纹理类型回退solid并提示。
- 历史快照包含材质归属和设置深拷贝；画布渲染读取Engine内部材质状态，恢复时同步通知App。

- [x] 写失败测试 `projectRoundTrip`、`legacyHiddenLayers`、`undoProperties`、`fourRotations`、`cropOrigins`、`recognitionPreservesMaterials`、`invalidAssignmentData`。
- [x] 运行测试确认当前只保存RGBA/颜色设置不能满足新断言。
- [x] 实现v2编码、旧格式迁移和快照；新来源/PDF分页清空材质而不串页。
- [x] 旋转归属平面并更新材质图案坐标变换；裁切扣除原点偏移，重识别保留归属；复用组合函数导出材质。
- [x] 浏览器验证1x/2x、普通/透明导出、保存重开、历史恢复；确认四次旋转渲染像素一致，提交 `feat: persist material projects and reversible edits`。

### Task 4: 材质库与属性/图层界面

**Files:** Create三个Material组件；Modify `src/App.jsx`, `src/components/FillShadowSettings.jsx`, `src/styles.css`；Test `tests/material-browser.mjs`。

**Interfaces:**
- `MaterialLibrary({material,onChoose,onClose})`：纯色/纹理页签，纹理分类下拉及8种缩略图。
- `MaterialProperties({material,selection,scope,onScopeChange,onChange,onRemoveTexture})`：无选区标注“下一次填充”，编辑只修改待用材质。
- `MaterialLayers({layers,selectedId,onSelect,onChange,onDelete,linePosition,onLinePositionChange})`：缩略图、名字、区域数、显示/隐藏、整体透明度。
- App统一材质编辑回调：有选区调用Editor ref，无选区更新activeMaterial；显式作用范围传入ref。

- [x] 写失败浏览器断言 `materialLibraryNavigation`、`selectedProperties`、`allExistingControlsReachable`、`responsiveInspector`。
- [x] 运行浏览器测试确认缺少材质入口和页签导致失败。
- [x] 左工具栏增加材质入口，保留原5色竖向配色；右侧仅属性/图层；作品级设置由上方设置面板、历史按钮访问，关闭按钮及Escape均可返回画布。
- [x] 材质属性显示尺寸/角度/底色/纹理色/纹理透明度/编辑范围；独立阴影迁移到材质实例键，保留当前预设。
- [x] 检查桌面与窄屏无页面横向溢出、点击外部/Escape关闭浮层、关键入口标签清晰；提交 `feat: streamline material library and inspector layout`。

### Task 5: 整体回归与本地交付

**Files:** Modify `tests/material-browser.mjs`、计划勾选状态（不扩展产品范围）。

- [x] 增加回归场景：真实矢量PDF、透明PNG、大围合区、间隙防漏、同色材质替换、两个房间局部/整组编辑、线稿上下层、背景、阴影、导出、旧项目。
- [x] `npm test`所有状态测试通过；`npm run build`成功。
- [x] 在未占用本地端口启动服务，通过浏览器执行回归，无运行时异常，留存桌面和窄屏截图。
- [x] 检查git diff仅涉及本任务；整体代码复核关注兼容、归属变换和无选区编辑作用范围。
- [x] 更新计划勾选结果并提交，提供本地链接、已验证功能与剩余限制；不自动推送GitHub。

## 实际验证记录

- 17项Node状态/几何单测通过；Vite生产构建成功。
- Browser plugin not available，使用已安装的Playwright验证；脚本与截图位于 `/tmp/floor-material-qa.YqNxjZ/`，不将临时浏览器报告加入仓库。
- 图案：8种有实际像素输出；掩码裁切不越界；人字拼每格恰好属于一块板。
- Editor：填充、参数撤回、四次旋转像素一致、重新识别保留材质、项目重开像素一致、2x透明导出。
- UI：材质库、属性/图层、局部实例拆分、保留整组修改范围、图层开关撤回、设置Escape、390px属性面板。
- 回归：透明PNG、八种纹理、v1隐藏/透明/阴影迁移、v2保存重开、损坏项目不替换当前源或设置、裁切撤回、390/760/800/1024/1440宽度。
- 矢量PDF：1800px渲染识别4个大围合区、填充、四次旋转、阴影撤回、3600×2520透明PNG、线稿置底、分页清空材质、手机保存/打开。
- 最后独立审查发现图层元数据校验与滑块历史问题，已修复；25步拖动及数字框连续输入均只产生一条历史，撤回恢复原值；未知纹理回退提示与待用色值同步已验证。
- 图案复用缓存，悬停使用独立覆盖画布；仅验证已测1800px PDF和Chromium场景，超大文档、Safari和其他设备仍需专项测试。
- 临时浏览器脚本另增 `slider.mjs`；6个浏览器验证脚本与17项单测通过，生产构建通过。尚未合并或推送GitHub。
