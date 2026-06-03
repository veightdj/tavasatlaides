import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/cookie-policy")({
  head: () => ({
    meta: [
      { title: "Sīkdatņu politika — TavasAtlaides" },
      { name: "description", content: "TavasAtlaides.lv sīkdatņu politika un informācija par sīkdatņu izmantošanu." },
      { property: "og:title", content: "Sīkdatņu politika — TavasAtlaides" },
      { property: "og:description", content: "TavasAtlaides.lv sīkdatņu politika un informācija par sīkdatņu izmantošanu." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CookiePolicyPage,
});

function CookiePolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <h1 className="text-3xl font-bold">Sīkdatņu politika</h1>
        <p className="text-muted-foreground">Pēdējo reizi atjaunināts: 2026. gada 3. jūnijā</p>

        <p>
          Šī sīkdatņu politika informē par to, kā TavasAtlaides.lv (turpmāk – "Platforma") izmanto sīkdatnes un līdzīgas tehnoloģijas, kad apmeklējat mūsu vietni.
        </p>

        <h2 className="text-xl font-semibold mt-8">1. Kas ir sīkdatnes?</h2>
        <p>
          Sīkdatnes ir mazi teksta faili, kas tiek saglabāti Jūsu ierīcē (datorā, planšetē vai viedtālrunī), kad apmeklējat tīmekļa vietni. Tās ļauj vietnei atcerēties Jūsu darbības un preferences (piemēram, valodu, fonta izmēru u.c.) noteiktu laiku, lai Jums nebūtu tās jāievada atkārtoti katrā lapā.
        </p>

        <h2 className="text-xl font-semibold mt-8">2. Kādas sīkdatnes mēs izmantojam?</h2>

        <h3 className="text-lg font-semibold mt-4">2.1. Nepieciešamās sīkdatnes (obligātas)</h3>
        <p>
          Šīs sīkdatnes ir nepieciešamas Platformas pamatfunkciju darbībai. Bez tām vietne nevar pareizi funkcionēt. Tās parasti tiek iestatītas atbildes uz Jūsu darbībām, piemēram, valodas izvēlei vai lietotāja sesijas pārvaldībai.
        </p>
        <ul>
          <li><strong>Valodas preferences</strong> — saglabā Jūsu izvēlēto valodu (LV/EN/RU) nākamajiem apmeklējumiem.</li>
          <li><strong>Lietotāja sesija</strong> — nodrošina autentificētu lietotāju sesiju drošu darbību Platformā.</li>
        </ul>

        <h3 className="text-lg font-semibold mt-4">2.2. Analītiskās sīkdatnes</h3>
        <p>
          Mēs izmantojam Google Analytics, lai apkopotu anonīmu statistiku par to, kā lietotāji mijiedarbojas ar mūsu Platformu. Šī informācija palīdz mums uzlabot vietnes funkcionalitāti un lietotāju pieredzi.
        </p>
        <ul>
          <li><strong>Google Analytics</strong> — apkopo anonīmus datus par lapu skatījumiem, apmeklējumu ilgumu un lietotāju uzvedību.</li>
        </ul>

        <h3 className="text-lg font-semibold mt-4">2.3. Reklāmas sīkdatnes</h3>
        <p>
          Nākotnē mēs varam izmantot Google AdMob vai AdSense reklāmas platformu. Šīs sīkdatnes var tikt izmantotas, lai rādītu personalizētas reklāmas, pamatojoties uz Jūsu interesēm.
        </p>

        <h2 className="text-xl font-semibold mt-8">3. Trešo pušu sīkdatnes</h2>
        <p>
          Dažas sīkdatnes tiek iestatītas trešo pušu pakalpojumiem, kurus mēs izmantojam:
        </p>
        <ul>
          <li><strong>Google Analytics</strong> — analītikas un statistikas vākšanai.</li>
          <li><strong>Google Maps</strong> — kartes funkcionalitātes nodrošināšanai.</li>
          <li><strong>Google reklāmas pakalpojumi</strong> — personalizētu reklāmu rādīšanai (ja iespējots nākotnē).</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">4. Kā pārvaldīt sīkdatnes?</h2>
        <p>
          Jūs varat pārvaldīt un dzēst sīkdatnes, izmantojot savas pārlūkprogrammas iestatījumus. Lūdzu, ņemiet vērā, ka sīkdatņu bloķēšana var ietekmēt Platformas funkcionalitāti.
        </p>
        <p>
          Lai uzzinātu vairāk par sīkdatņu pārvaldību populārākajās pārlūkprogrammās, apmeklējiet:
        </p>
        <ul>
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Chrome</a></li>
          <li><a href="https://support.mozilla.org/lv/kb/sikdatnes-informacija-kas-uzglabata-datora" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mozilla Firefox</a></li>
          <li><a href="https://support.apple.com/lv-lv/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Safari</a></li>
        </ul>

        <h2 className="text-xl font-semibold mt-8">5. Sīkdatņu piekrišana</h2>
        <p>
          Apmeklējot mūsu Platformu pirmo reizi, Jums tiks piedāvāts piekrist sīkdatņu izmantošanai. Jūs varat jebkurā laikā mainīt savas preferences vai atsaukt piekrišanu.
        </p>

        <h2 className="text-xl font-semibold mt-8">6. Sazināties ar mums</h2>
        <p>
          Ja Jums ir jautājumi par mūsu sīkdatņu politiku, lūdzu, sazinieties ar mums: <a href="mailto:info@tavasatlaides.lv" className="text-primary hover:underline">info@tavasatlaides.lv</a>
        </p>
      </article>
    </div>
  );
}
