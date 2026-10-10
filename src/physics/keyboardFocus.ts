// A key held while the window loses focus never sends its keyup, so the
// keyboard controllers release everything when focus or visibility goes.
export function onInputFocusLost(release: () => void): () => void {
  const onVisibility = () => {
    if (document.hidden) release()
  }
  window.addEventListener('blur', release)
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    window.removeEventListener('blur', release)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
