import Link from "next/link";

export default function PublicInfoPage({ title, eyebrow, description, sections = [] }) {
  return (
    <main className="min-h-screen bg-[#020302] px-5 py-10 text-[#f5f7f4] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex rounded-full border border-[#8B9C8C]/20 px-4 py-2 text-sm text-[#d9e1d8] hover:border-[#8B9C8C]/45">
          Back to AI Website Readiness Checker
        </Link>
        <section className="py-14">
          <p className="text-sm uppercase tracking-[0.28em] text-[#8B9C8C]">{eyebrow}</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[#d9e1d8]/82">{description}</p>
        </section>
        <div className="grid gap-5 pb-16">
          {sections.map((section) => (
            <section key={section.heading} className="rounded-3xl border border-[#8B9C8C]/18 bg-white/[0.035] p-6">
              <h2 className="text-2xl font-semibold text-white">{section.heading}</h2>
              <p className="mt-3 text-sm leading-7 text-[#d9e1d8]/82">{section.copy}</p>
              {section.items && (
                <ul className="mt-4 grid gap-2 text-sm leading-6 text-[#d9e1d8]/82 sm:grid-cols-2">
                  {section.items.map((item) => (
                    <li key={item} className="rounded-2xl border border-[#8B9C8C]/12 bg-black/20 px-4 py-3">{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
