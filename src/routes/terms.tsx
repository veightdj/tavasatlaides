import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Lietošanas noteikumi — TavasAtlaides" },
      { name: "description", content: "TavasAtlaides.lv lietošanas noteikumi un pakalpojuma noteikumi." },
      { property: "og:title", content: "Lietošanas noteikumi — TavasAtlaides" },
      { property: "og:description", content: "TavasAtlaides.lv lietošanas noteikumi un pakalpojuma noteikumi." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1 className="text-3xl font-bold">Lietošanas noteikumi</h1>
        <p className="text-muted-foreground">Pēdējo reizi atjaunināts: 2026. gada 3. jūnijā</p>

        <p>
          Šie lietošanas noteikumi (turpmāk – "Noteikumi") regulē platformas TavasAtlaides.lv (turpmāk – "Platforma") lietošanu. Lietojot Platformu, Jūs piekrītat šiem Noteikumiem.
        </p>

        <h2 className="text-xl font-semibold mt-8">1. Pakalpojuma apraksts</h2>
        <p>
          TavasAtlaides.lv ir platforma, kas savieno vietējos veikalu īpašniekus un pakalpojumu sniedzējus ar potenciālajiem klientiem, piedāvājot akcijas, atlaides un īpašos piedāvājumus. Platforma neatbild par veikalu sniegtajiem pakalpojumiem vai produktu kvalitāti.
        </p>

        <h2 className="text-xl font-semibold mt-8">2. Reģistrācija un konts</h2>
        <p>
          Lai izmantotu Platformas funkcijas, Jums jāizveido konts, norādot derīgu e-pasta adresi. Jūs esat atbildīgs par sava konta drošību un paroli. Aizliegts izmantot citu personu identitāti vai sniegt nepatiesu informāciju.
        </p>

        <h2 className="text-xl font-semibold mt-8">3. Lietotāju pienākumi</h2>
        <ul>
          <li>Nesniegt nepatiesu, maldinošu vai aizskarošu informāciju.</li>
          <li>Nelietot Platformu nelikumīgiem mērķiem vai krāpniecībai.</li>
          <li>Necentīgi neizmantot Platformas tehniskos resursus.</li>
          <li>Ievērot Latvijas Republikas likumdošanu un ES regulējumu.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">4. Tirgotāju noteikumi</h2>
        <p>
          Veikalu īpašnieki un pakalpojumu sniedzēji ir atbildīgi par sniegto piedāvājumu pareizību, cenu norādēm un akciju nosacījumiem. TavasAtlaides patur tiesības dzēst piedāvājumus, kas pārkāpj likumdošanu vai šos Noteikumus.
        </p>

        <h2 className="text-xl font-semibold mt-8">5. Intelektuālā īpašuma tiesības</h2>
        <p>
          Visa Platformas saturā, dizainā un kodā ietvertā intelektuālā īpašuma tiesības pieder SIA ALRI GROUP. Lietotāji saglabā tiesības uz saviem augšupielādētajiem attēliem un tekstu, taču piešķir Platformai neekskluzīvu licenci tos publicēt.
        </p>

        <h2 className="text-xl font-semibold mt-8">6. Atbildības ierobežojums</h2>
        <p>
          TavasAtlaides nodrošina Platformas tehnisko darbību, bet neatbild par tirgotāju piedāvāto preču un pakalpojumu kvalitāti, pieejamību vai cenu pareizību. Lietotāji izmanto Platformu uz pašu risku.
        </p>

        <h2 className="text-xl font-semibold mt-8">7. Noteikumu grozījumi</h2>
        <p>
          TavasAtlaides patur tiesības jebkurā laikā grozīt šos Noteikumus. Par būtiskiem grozījumiem lietotāji tiks informēti pa e-pastu vai Platformas paziņojumu sistēmu.
        </p>

        <h2 className="text-xl font-semibold mt-8">8. Kontakti</h2>
        <p>
          Jautājumu vai pretenziju gadījumā sazinieties ar mums: <a href="mailto:info@tavasatlaides.lv" className="text-primary hover:underline">info@tavasatlaides.lv</a>
        </p>
      </article>
    </div>
  );
}
