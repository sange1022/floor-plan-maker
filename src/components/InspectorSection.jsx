import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function InspectorSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="inspector-section">
      <button className="section-heading" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <h2>{title}</h2>
        {open ? <ChevronUp size={15} strokeWidth={1.8} /> : <ChevronDown size={15} strokeWidth={1.8} />}
      </button>
      {open ? <div className="section-content">{children}</div> : null}
    </section>
  )
}
