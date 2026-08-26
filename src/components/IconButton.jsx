export default function IconButton({ icon: Icon, label, active = false, onClick }) {
  return (
    <button className={`tool-button ${active ? 'active' : ''}`} type="button" onClick={onClick} aria-pressed={active}>
      <Icon size={21} strokeWidth={1.7} />
      <span>{label}</span>
    </button>
  )
}
