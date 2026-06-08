import { createFileRoute } from "@tanstack/react-router";

const QA = [
  {
    q: "Kas ir TavasAtlaides?",
    a: "TavasAtlaides ir vietējo veikalu un pakalpojumu atlaižu platforma Latvijai un Baltijai. Mēs apkopojam aktīvas akcijas vienā vietā, lai tu varētu ietaupīt vairāk.",
  },
  {
    q: "Vai lietotne ir bez maksas?",
    a: "Jā, piedāvājumu pārlūkošana ir pilnībā bez maksas un bez reģistrācijas.",
  },
  {
    q: "Kā atrast piedāvājumus tuvumā?",
    a: "Atver lietotni app.tavasatlaides.lv un izmanto sadaļu Tuvumā vai Karte — sistēma izmantos tavu atrašanās vietu, lai parādītu tuvākos piedāvājumus.",
  },
  {
    q: "Vai es varu publicēt savus piedāvājumus?",
    a: "Jā. Reģistrējies kā veikals partner.tavasatlaides.lv portālā un publicē savas akcijas dažu minūšu laikā.",
  },
  {
    q: "Cik bieži tiek atjaunoti piedāvājumi?",
    a: "Reāllaikā — tiklīdz veikals publicē jaunu piedāvājumu, tas uzreiz parādās lietotnē.",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — TavasAtlaides" },
      { name: "description", content: "Atbildes uz biežāk uzdotajiem jautājumiem par TavasAtlaides — atlaižu platformu Latvijai un Baltijai." },
      { property: "og:title", content: "FAQ — TavasAtlaides" },
      { property: "og:description", content: "Atbildes uz biežāk uzdotajiem jautājumiem par TavasAtlaides." },
      { property: "og:url", content: "https://tavasatlaides.lv/faq" },
    ],
    links: [{ rel: "canonical", href: "https://tavasatlaides.lv/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: QA.map(({ q, a }) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        }),
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14 md:py-20">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Biežāk uzdotie jautājumi</h1>
      <p className="mt-3 text-muted-foreground">Neatrodi atbildi? Raksti mums uz lapas Kontakti.</p>
      <div className="mt-10 space-y-4">
        {QA.map(({ q, a }) => (
          <details key={q} className="group rounded-2xl border border-border bg-card p-5 open:shadow-sm">
            <summary className="cursor-pointer font-semibold text-base md:text-lg list-none flex items-start justify-between gap-4">
              <span>{q}</span>
              <span className="text-muted-foreground group-open:rotate-45 transition-transform text-xl leading-none">+</span>
            </summary>
            <p className="mt-3 text-muted-foreground leading-relaxed">{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
