import { useEffect, useRef } from 'react'
import { paintMaterial } from '../lib/materialPatterns'

export default function MaterialThumbnail({ material, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    paintMaterial(ctx, material, canvas.width, canvas.height)
  }, [material.type, material.color, material.inkColor, material.size, material.angle, material.textureOpacity])
  return <canvas ref={ref} width="128" height="88" className={`material-thumbnail ${className}`} aria-hidden="true" />
}
