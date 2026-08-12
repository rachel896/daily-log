import { useCallback, useEffect, useRef, useState } from 'react'

/** Measured container width, so SVG text stays crisp instead of scaling. */
export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)

  const setNode = useCallback((node: T | null) => {
    ref.current = node
    if (node) setWidth(node.clientWidth)
  }, [])

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      setWidth(Math.round(w))
    })
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  return { ref: setNode, width }
}
