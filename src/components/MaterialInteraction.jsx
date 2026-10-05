// Group live range/number/color input updates into one undoable interaction.
export default function MaterialInteraction({ onStart, onEnd, children }) {
  const isInput = event => event.target.matches('input')
  const isRange = event => event.target.matches('input[type=range]')
  return <div onFocusCapture={event => { if (isInput(event) && !isRange(event)) onStart('focus') }}
    onBlur={event => { if (isInput(event)) onEnd() }}
    onPointerDownCapture={event => { if (isRange(event)) onStart('pointer') }}
    onPointerUp={event => { if (isRange(event)) onEnd() }}
    onPointerCancel={onEnd}
    onKeyDownCapture={event => { if (isRange(event) && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) onStart('keyboard') }}
    onKeyUp={event => { if (isRange(event) && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) onEnd() }}>
    {children}
  </div>
}
