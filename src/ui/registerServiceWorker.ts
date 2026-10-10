// Production only: in dev a service worker would cache Vite's unbundled
// modules and fight hot reload. Registration failure is harmless; the game
// simply needs a connection.
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const base = import.meta.env.BASE_URL
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => undefined)
  })
}
