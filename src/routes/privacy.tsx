import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privātuma politika — TavasAtlaides" },
      { name: "description", content: "TavasAtlaides.lv privātuma politika un personas datu apstrādes principi." },
      { property: "og:title", content: "Privātuma politika — TavasAtlaides" },
      { property: "og:description", content: "TavasAtlaides.lv privātuma politika un personas datu apstrādes principi." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1 className="text-3xl font-bold">Privātuma politika lietotnei TavasAtlaides.lv</h1>
        <p className="text-muted-foreground">Pēdējo reizi atjaunināts: 2026. gada 3. jūnijā</p>

        <p>
          SIA ALRI GROUP (turpmāk – "mēs", "mūsu" vai "Pārzinis") nodrošina lietotni TavasAtlaides.lv (turpmāk – "Lietotne"). Šī Privātuma politika informē Jūs par mūsu politiku attiecībā uz personas datu vākšanu, izmantošanu un izpaušanu, kad izmantojat mūsu Lietotni, kā arī par Jūsu tiesībām saskaņā ar ES Vispārīgo datu aizsardzības regulu (GDPR).
        </p>

        <h2 className="text-xl font-semibold mt-8">1. Datu pārzinis</h2>
        <ul>
          <li>Uzņēmums: SIA ALRI GROUP</li>
          <li>E-pasts saziņai: info@tavasatlaides.lv</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">2. Apkopotie dati un to izmantošanas mērķi</h2>

        <h3 className="text-lg font-semibold mt-4">A. Konta un autentifikācijas dati</h3>
        <p>Lai izveidotu profilu un nodrošinātu Lietotnes personalizētās funkcijas, mēs apstrādājam Jūsu datus:</p>
        <ul>
          <li><strong>E-pasts un parole:</strong> Ja reģistrējaties manuāli.</li>
          <li><strong>Google Sign-In dati:</strong> Ja izvēlaties reģistrēties ar Google, mēs saņemam Jūsu Google publiskā profila informāciju (vārdu, e-pasta adresi un profila attēla URL).</li>
        </ul>

        <h3 className="text-lg font-semibold mt-4">B. Atrašanās vietas dati (Location Data) – Svarīga informācija</h3>
        <p>Lietotne piedāvā funkciju, kas informē Jūs par aktuālajām atlaidēm un tirgotāju piedāvājumiem Jūsu tuvumā.</p>
        <ul>
          <li><strong>Fona atrašanās vieta (Background Location):</strong> TavasAtlaides.lv apkopo un apstrādā Jūsu ierīces precīzas atrašanās vietas datus pat tad, ja Lietotne ir aizvērta vai netiek aktīvi izmantota. Tas ir nepieciešams, lai nosūtītu Jums push paziņojumus par atlaidēm, kad atrodaties tuvu kādam no sadarbības partneru veikaliem.</li>
          <li>Piekļuve atrašanās vietai fonā tiek aktivizēta tikai pēc Jūsu skaidras un brīvprātīgas piekrišanas sniegšanas ierīces iestatījumos. Jūs varat jebkurā laikā mainīt šo piekļuvi ierīces operētājsistēmas iestatījumos.</li>
        </ul>

        <h3 className="text-lg font-semibold mt-4">C. Push paziņojumi (Push Notifications)</h3>
        <p>Ar Jūsu atļauju mēs izmantojam ierīces paziņojumu žetonus (tokens), lai sūtītu paziņojumus par tuvumā esošiem darījumiem un jaunumiem.</p>

        <h2 className="text-xl font-semibold mt-8">3. Trešo pušu pakalpojumi un SDK</h2>
        <p>Lietotnes darbības nodrošināšanai, analītikai un monetizācijai mēs izmantojam šādus Google pakalpojumus:</p>
        <ul>
          <li><strong>Google Cloud / Firebase Authentication:</strong> Lietotāju drošai reģistrācijai un autorizācijai.</li>
          <li><strong>Google Maps API:</strong> Lai attēlotu veikalu un atlaižu atrašanās vietas kartē.</li>
          <li><strong>Google Analytics:</strong> Lai apkopotu anonīmu statistiku par Lietotnes lietošanas paradumiem un uzlabotu tās darbību.</li>
          <li><strong>Google AdMob / AdSense:</strong> Nākotnē Lietotnē var tikt rādītas reklāmas. Šie servisi var izmantot reklāmas identifikatorus (piemēram, Google Advertising ID), lai rādītu personalizētas reklāmas.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">4. Datu glabāšana un Konta dzēšana (Data Deletion Requirement)</h2>
        <p>Mēs glabājam Jūsu personas datus tikai tik ilgi, cik nepieciešams pakalpojuma nodrošināšanai.</p>
        <p><strong>Konta un datu dzēšanas tiesības:</strong> Jums ir pilna kontrole pār saviem datiem. Lietotājam ir iespēja dzēst savu kontu un visus ar to saistītos datus tieši no Lietotnes iestatījumiem. Pēc dzēšanas pieprasījuma apstiprināšanas Jūsu profils, saglabātie dati un autorizācijas informācija tiek neatgriezeniski dzēsti no mūsu aktīvajām datubāzēm. Alternatīvi, Jūs varat pieprasīt datu dzēšanu, rakstot uz info@tavasatlaides.lv.</p>

        <h2 className="text-xl font-semibold mt-8">5. Lietotāju vecuma ierobežojums</h2>
        <p>Lietotne TavasAtlaides.lv nav paredzēta personām, kas jaunākas par 13 gadiem. Mēs apzināti nevācam datus no bērniem, kas jaunāki par šo vecumu.</p>

        <h2 className="text-xl font-semibold mt-8">6. Jūsu tiesības saskaņā ar GDPR</h2>
        <p>Jums ir tiesības piekļūt saviem datiem, pieprasīt labojumus, ierobežot apstrādi vai iebilst pret to. Ja uzskatāt, ka datu apstrāde pārkāpj regulu, Jums ir tiesības vērsties Datu valsts inspekcijā (<a href="https://www.dvi.gov.lv" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.dvi.gov.lv</a>).</p>
      </article>
    </div>
  );
}
