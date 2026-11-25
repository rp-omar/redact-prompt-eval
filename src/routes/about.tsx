import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: () => (
    <section>
      <h1>About</h1>
      <p>Evaluation app for the "Build a fast client-rendered React app" prompt.</p>
    </section>
  ),
})
