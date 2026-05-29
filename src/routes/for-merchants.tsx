import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/use-i18n";

export const Route = createFileRoute("/for-merchants")({
  head: () => ({
    meta: [
      { title: "For merchants — TavasAtlaides" },
      { name: "description", content: "Publish your store deals for free on TavasAtlaides and reach local customers in Riga & Jurmala." },
      { property: "og:title", content: "For merchants — TavasAtlaides" },
      { property: "og:description", content: "Publish your store deals for free on TavasAtlaides and reach local customers in Riga & Jurmala." },
      { property: "og:url", content: "https://superatlaides.lovable.app/for-merchants" },
      { name: "twitter:title", content: "For merchants — TavasAtlaides" },
      { name: "twitter:description", content: "Publish your store deals for free on TavasAtlaides and reach local customers in Riga & Jurmala." },
    ],
    links: [{ rel: "canonical", href: "https://superatlaides.lovable.app/for-merchants" }],
  }),
  component: ForMerchants,
});

function ForMerchants() {
  const { t } = useI18n();
  return (
    <div>
      <section className="bg-gradient-warm text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{t.forMerchants.title}</h1>
          <p className="mt-4 text-lg text-primary-foreground/90 max-w-2xl mx-auto">{t.forMerchants.body}</p>
          <Button asChild size="lg" variant="secondary" className="mt-8 rounded-full">
            <Link to="/signup">{t.forMerchants.cta}<ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-16">
        <ul className="space-y-4 text-lg">
          {t.forMerchants.benefits.map((line) => (
            <li key={line} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-primary shrink-0 mt-1" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
