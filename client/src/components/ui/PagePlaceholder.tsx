/** Temporary stand-in for pages that are scaffolded but not yet built. */
export function PagePlaceholder({ title, description }: { title: string; description?: string }) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-wide">{title}</h1>
      <div className="mt-3 h-px w-16 bg-gold-500" />
      {description && <p className="mt-6 max-w-2xl leading-relaxed text-ink/70">{description}</p>}
      <p className="mt-8 text-xs uppercase tracking-[0.2em] text-sage-600">Coming soon</p>
    </section>
  );
}
