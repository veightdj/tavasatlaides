import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageSquare, Store } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Kontakti — TavasAtlaides" },
      { name: "description", content: "Sazinies ar TavasAtlaides komandu — atbalsts lietotājiem, sadarbība veikaliem un partneriem." },
      { property: "og:title", content: "Kontakti — TavasAtlaides" },
      { property: "og:description", content: "Sazinies ar TavasAtlaides komandu." },
      { property: "og:url", content: "https://tavasatlaides.lv/contact" },
    ],
    links: [{ rel: "canonical", href: "https://tavasatlaides.lv/contact" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "TavasAtlaides — Kontakti",
          url: "https://tavasatlaides.lv/contact",
        }),
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14 md:py-20">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Sazinies ar mums</h1>
      <p className="mt-3 text-muted-foreground max-w-xl">
        Mums rūp tava pieredze. Izvēlies piemērotāko veidu, kā sazināties.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <a
          href="mailto:hello@tavasatlaides.lv"
          className="rounded-2xl border border-border bg-card p-6 hover:border-primary transition-colors"
        >
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <MessageSquare className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-bold">Lietotāju atbalsts</h2>
          <p className="text-sm text-muted-foreground mt-1">hello@tavasatlaides.lv</p>
        </a>

        <a
          href="mailto:partners@tavasatlaides.lv"
          className="rounded-2xl border border-border bg-card p-6 hover:border-primary transition-colors"
        >
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Store className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-bold">Sadarbība veikaliem</h2>
          <p className="text-sm text-muted-foreground mt-1">partners@tavasatlaides.lv</p>
        </a>

        <a
          href="mailto:press@tavasatlaides.lv"
          className="rounded-2xl border border-border bg-card p-6 hover:border-primary transition-colors sm:col-span-2"
        >
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Mail className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-bold">Prese un mediji</h2>
          <p className="text-sm text-muted-foreground mt-1">press@tavasatlaides.lv</p>
        </a>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Atbildam darba dienās 1–2 dienu laikā.
      </p>
    </div>
  );
}
