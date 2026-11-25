// In-page timing marks shared by the Playwright benchmark (init script) and the WebDriver
// run against real browsers (injected into index.html by scripts/serve.mjs).
// Self-contained: it is serialised with Function.prototype.toString and run in the page.
// "seen" = DOM committed; "painted" = first frame after that (requestAnimationFrame + a
// MessageChannel hop, i.e. after style/layout/paint of that frame).
export function installMarks() {
  const marks = (window.__marks = { seen: {}, painted: {}, t0: 0 })
  const selectors = {
    row: '[data-testid=row]',
    item: '[data-testid=item-name]',
    fallback: '[data-testid=activity-fallback]',
    activity: '[data-testid=activity]',
  }
  const afterPaint = (callback) =>
    requestAnimationFrame(() => {
      const channel = new MessageChannel()
      channel.port1.onmessage = callback
      channel.port2.postMessage(0)
    })
  window.__afterPaint = afterPaint
  const check = () => {
    for (const [name, selector] of Object.entries(selectors)) {
      if (name in marks.seen || !document.querySelector(selector)) continue
      marks.seen[name] = performance.now()
      afterPaint(() => (marks.painted[name] = performance.now()))
    }
  }
  new MutationObserver(check).observe(document, { childList: true, subtree: true })
  // Restart the clock for an in-page navigation; t0 is the next trusted or synthetic click.
  window.__resetOnClick = () => {
    marks.seen = {}
    marks.painted = {}
    window.addEventListener('click', () => (marks.t0 = performance.now()), { capture: true, once: true })
  }
  // Restart the clock now, for a navigation started from script.
  window.__resetNow = () => {
    marks.seen = {}
    marks.painted = {}
    marks.t0 = performance.now()
  }
  // Resolves once the committed rows reflect the input's value after the next keystroke.
  window.__armKey = () => {
    window.__keyResult = undefined
    window.__key = new Promise((resolve) => {
      const input = document.querySelector('[data-testid=filter]')
      const table = document.querySelector('[data-testid=rows]')
      let t0
      let echo = 0
      let done = false
      const check = () => {
        if (done || t0 === undefined || table.dataset.applied !== input.value) return
        done = true
        observer.disconnect()
        const commit = performance.now() - t0
        afterPaint(() => resolve((window.__keyResult = { commit, paint: performance.now() - t0, echo })))
      }
      const observer = new MutationObserver(check)
      observer.observe(table, { attributes: true, attributeFilter: ['data-applied'] })
      window.addEventListener(
        'input',
        () => {
          t0 = performance.now()
          afterPaint(() => (echo ||= performance.now() - t0))
          queueMicrotask(check)
        },
        { capture: true, once: true },
      )
    })
  }
}
