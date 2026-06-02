import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/i18n/use-i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — TavasAtlaides" },
      { name: "description", content: "TavasAtlaides helps shoppers in Riga discover local discounts and promotions in one place." },
      { property: "og:title", content: "About — TavasAtlaides" },
      { property: "og:description", content: "TavasAtlaides helps shoppers in Riga discover local discounts and promotions in one place." },
      { property: "og:url", content: "https://superatlaides.lovable.app/about" },
      { name: "twitter:title", content: "About — TavasAtlaides" },
      { name: "twitter:description", content: "TavasAtlaides helps shoppers in Riga discover local discounts and promotions in one place." },
    ],
    links: [{ rel: "canonical", href: "https://superatlaides.lovable.app/about" }],
  }),
  component: About,
});

function About() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">{t.about.title}</h1>
      <p className="mt-6 text-lg text-muted-foreground leading-relaxed">{t.about.body}</p>
    </div>
  );
}
