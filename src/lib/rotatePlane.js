// Rotate source pixels, recognition mask and paint identically without interpolation.
export function rotatePlane(data, width, height, channels = 1, clockwise = true) {
  const result = new data.constructor(data.length)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const from = (y * width + x) * channels
      const to = (clockwise ? x * height + height - 1 - y : (width - 1 - x) * height + y) * channels
      for (let channel = 0; channel < channels; channel += 1) result[to + channel] = data[from + channel]
    }
  }
  return result
}
