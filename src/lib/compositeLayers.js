// The background is drawn first by the caller. Use the same stack for preview and export.
export function drawArtworkLayers(context, { lineCanvas, fillCanvas, shadowCompositeCanvas }, linePosition = 'top') {
  const layers = linePosition === 'bottom'
    ? [lineCanvas, shadowCompositeCanvas, fillCanvas]
    : [shadowCompositeCanvas, fillCanvas, lineCanvas]
  for (const layer of layers) {
    if (layer) context.drawImage(layer, 0, 0)
  }
}
