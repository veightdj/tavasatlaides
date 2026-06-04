import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Konta dzēšana — TavasAtlaides" },
      {
        name: "description",
        content:
          "Kā dzēst savu TavasAtlaides kontu un kādi dati tiek izdzēsti. Google Play prasībām atbilstoša instrukcija.",
      },
    ],
  }),
  component: DeleteAccountInfo,
});

function DeleteAccountInfo() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10 md:py-14 pb-24 md:pb-12 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Konta un datu dzēšana
        </h1>
        <p className="text-muted-foreground">
          Šī lapa skaidro, kā dzēst savu TavasAtlaides kontu un kādi dati
          tiek izdzēsti.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Kā dzēst savu kontu</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed">
          <li>Ielogojies savā TavasAtlaides kontā.</li>
          <li>
            Atver{" "}
            <Link to="/settings" className="underline">
              Iestatījumi → Privātums un konts
            </Link>
            .
          </li>
          <li>
            Sadaļā <strong>Dzēst kontu</strong> nospied pogu un apstiprini darbību.
          </li>
        </ol>
        <p className="text-sm text-muted-foreground">
          Ja nevari piekļūt savam kontam, raksti uz{" "}
          <a href="mailto:info@tavasatlaides.lv" className="underline">
            info@tavasatlaides.lv
          </a>{" "}
          no e-pasta, kas saistīts ar kontu, un mēs to dzēsīsim manuāli.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Kādi dati tiek dzēsti</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
          <li>Lietotāja profils (vārds, telefons, e-pasts, autentifikācijas konts).</li>
          <li>Saglabātie piedāvājumi un izlase.</li>
          <li>Paziņojumu iestatījumi un vēsture.</li>
          <li>Augšupielādētie attēli (logo, sludinājumu foto).</li>
          <li>Veikala profili un to sludinājumi (ja esi veikala īpašnieks).</li>
          <li>Aktivitātes vēsture (skatījumi, klikšķi, dalīšanās).</li>
          <li>Visi pārējie ar tavu identitāti saistītie personas dati.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Kādi dati var tikt saglabāti</h2>
        <p className="text-sm leading-relaxed">
          Likumdošanas vai grāmatvedības prasību dēļ noteikti dati var tikt
          saglabāti ierobežotu laiku anonimizētā vai pseidonimizētā formā
          (piemēram, dzēšanas ieraksts auditam, bez personas identifikatoriem).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Cik ilgs ir dzēšanas process</h2>
        <p className="text-sm leading-relaxed">
          Konts un personas dati tiek izdzēsti uzreiz pēc apstiprinājuma.
          Manuāli pieprasījumi tiek apstrādāti līdz <strong>30 dienām</strong>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Sazinies ar atbalstu</h2>
        <p className="text-sm leading-relaxed">
          SIA ALRI GROUP — e-pasts:{" "}
          <a href="mailto:info@tavasatlaides.lv" className="underline">
            info@tavasatlaides.lv
          </a>
        </p>
      </section>
    </article>
  );
}
