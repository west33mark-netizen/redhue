# REDHUE · Mission Control (v3)

Ét samlet dashboard til din faceless creator-forretning:

| Sektion | Indhold |
|---|---|
| ◎ Overblik | Saldo, indtægt, aktiver, streak, pengestrøm, dagens tjekliste, pipeline, agenter, aktivitet, XP/robot |
| 🎯 Mission | 90-dages mission, daglig tjekliste, streak, fremdrift mod månedsmål |
| ▦ Pipeline | Kanban: Idé → Manuskript → Produktion → Postet |
| 🤖 Agenter (PRO) | Script, Hook & Caption, Planlægger, Analytiker. Output kan sendes direkte til Pipeline |
| 💳 Wallet | Indtægter/udgifter, graf over 6 måneder |
| 📈 Portefølje | Crypto med live CoinGecko-priser + fonde/ETF'er |
| 🛒 Produkter | Dine produkter + betalingslinks. "+1 salg" lander automatisk i Wallet |
| ⚙︎ Indstillinger | Pro-licens, backup/import, **eksport af data fra din gamle REDHUE** |

XP: +5 tjekliste · +10 postering · +15 postet video · +20 agentkørsel · +20 salg. Robotten udvikler sig 🥚 → 🐣 → 🤖 → 🦾 → 🚀.

## Deploy (Netlify)

Functions kræver Git-deploy eller Netlify CLI — **ikke** drag-and-drop.

**Nemmest på Windows:** dobbeltklik `deploy-redhue.bat`. Den logger ind, kobler sitet, sætter nøglerne og deployer — og viser din testnøgle til sidst.

**Manuelt med CLI:**
```
npm i -g netlify-cli
cd redhue
netlify login
netlify link        # vælg dit eksisterende REDHUE-site
netlify deploy --prod
```

**Environment variables** (Netlify → Site configuration → Environment variables):
- `ANTHROPIC_API_KEY` – påkrævet
- `GUMROAD_PRODUCT_ID` – påkrævet (produkt-ID for REDHUE Pro)
- `REDHUE_DEV_KEY` – valgfri; din egen hemmelige nøgle til at teste agenterne uden køb
- `ANTHROPIC_MODEL` – valgfri, standard `claude-sonnet-5`

**I `index.html`:** ret `GUMROAD_URL` øverst i scriptet til dit rigtige Gumroad-link.
**På Gumroad:** slå "Generate a unique license key per sale" til, og sæt evt. redirect til `https://DIT-SITE/?license={license_key}`.

## Lokal test (samlet port)
Alt kører på **én port: 8888** – både appen og agenterne (`/api/agents`). Det er låst i `netlify.toml` under `[dev]`.
Dobbeltklik `start-redhue.bat` (opretter en `.env` første gang), eller:
```
cd redhue
netlify dev
```
Åbn http://localhost:8888. Læg `ANTHROPIC_API_KEY` m.fl. i en `.env`-fil i mappen, eller link sitet (`netlify link`), så hentes de fra Netlify.

## Dine gamle data
Deployer du til **samme domæne** som din nuværende REDHUE, kan den nye app se de gamle data i browseren.
Gå til **Indstillinger → Data fra din gamle REDHUE → Eksportér gamle data**, og send filen til Claude — så bliver de flyttet ind i den nye struktur.
Den nye app rører aldrig de gamle nøgler.

## 💰 Sælg REDHUE (salgssiden ligger på /salg)
1. **Gumroad:** opret produktet "REDHUE Pro" og slå *Generate a unique license key per sale* til. Sæt redirect efter køb til `https://redhue.netlify.app/?license={license_key}`, så låser Pro op af sig selv.
2. **Netlify → Environment variables:** `GUMROAD_PRODUCT_ID`, `ANTHROPIC_API_KEY` og `REDHUE_DEV_KEY` (din egen ejer-nøgle).
3. **index.html:** sæt `GUMROAD_URL` i `CFG` til dit rigtige Gumroad-link.
4. **salg.html:** ret `SALE` nederst: `GUMROAD_URL`, `PRICE` og `COMPANY` (CVR og kontakt). Køb-knapperne vises først, når linket er rigtigt.
5. Husk handelsbetingelser og privatlivspolitik, før du sælger til forbrugere.

## 📱 REDHUE OS 2 (Android)
- **Hjemmeskærm** med ur, widgets og apps (start-skærm på mobil).
- **Stryg ned** fra toppen (eller tryk på statuslinjen): kontrolpanel med dagens opgaver, streak, sprog, vibration og tidszone.
- **Stryg op** (eller tryk "Stryg op for alle apps"): alle apps.
- **Del til REDHUE:** når appen er installeret, står REDHUE i Androids del-menu. Del et link fra TikTok, YouTube eller browseren, og det bliver en idé i Pipeline.
- **Badge** på app-ikonet med antal opgaver tilbage i dag, og let **vibration** ved tryk (kan slås fra).
- Androids tilbage-knap lukker panelet eller fører tilbage til hjemmeskærmen.

## 💬 Chat (Pro)
- **AI-coach** (`/api/coach`, `netlify/functions/coach.mjs`): chat med en coach, der får dine nøgletal med (mission, profit, pipeline). Bruger `ANTHROPIC_API_KEY`.
- **Fællesskab** (`/api/chat`, `netlify/functions/chat.mjs`): chat mellem Pro-brugere. Beskeder gemmes i **Netlify Blobs** (store `redhue-chat`) – ingen ekstra konto. Brugere identificeres anonymt ud fra licensen; du (ejer-nøglen) kan slette alle beskeder.
- Begge kræver en gyldig licens (Gumroad eller `REDHUE_DEV_KEY`). Netlify installerer `@netlify/blobs` fra `package.json` automatisk ved build.
- Se/ryd beskeder i Netlify under **Data & Storage → Blobs → redhue-chat**.

## 🧊 4D
- **Tesserakt i baggrunden:** en 4D-terning der roterer gennem den 4. dimension over tid, plus lys-partikler i dybden. På telefonens hjemmeskærm sidder den bag uret.
- **Dybde ved vip:** på telefonen vipper sektionen og hjemmeskærmens lag (ur, widgets, ikoner, dock) med gyroskopet. På computer står indholdet stille; baggrunden følger musen, og kortet under musen vipper og glinser.
- **Dimensionsskift:** sektioner glider ind fra dybden.
- Tænd/sluk under **Indstillinger → 4D** eller i kontrolpanelet. Slukket som standard ved "mindre bevægelse", pauser når appen ikke er åben, ca. 30 billeder/sek. for batteriet.

## ✦ REDHUE Guide (gratis for alle)
- Svæveknap ✦ nederst til højre på alle skærme. Kører **lokalt i appen**: ingen server, ingen AI-forbrug, virker offline.
- **Velkomst for nye brugere:** navn → niche → månedsmål med ét tryk, og så første skridt + installationsvejledning (Android/iPhone/computer).
- **Svarer på spørgsmål** om alle funktioner (dansk/engelsk) med knapper, der åbner det rigtige sted.
- **"Hvad skal jeg nu?"** ud fra brugerens egne tal: niche, dagens opgaver, pipeline, logning, profitmål, installation, Pro.
- Pro-brugere kan sende spørgsmål, guiden ikke kan svare på, videre til AI-coachen.

## 💜 Samhørighed og varme ("oxytocin")
Bygget omkring det, oxytocin handler om: samhørighed, anerkendelse og varme – uden pres-tællere eller falske notifikationer.
- **Hyldest (Pro):** ❤️ 🙌 🔥 på andres beskeder i Fællesskab. Gemmes som én blob pr. reaktion (`rx/<besked>/<bruger>/<emoji>`), så samtidige reaktioner aldrig overskriver hinanden. Man kan ikke hylde sig selv. "Du er blevet hyldet" vises kun for ægte reaktioner.
- **Del en sejr (Pro):** forslag ud fra egne tal (streak, profit, postede videoer, nået mål) eller egen tekst; vises som sejrs-kort.
- **Milepæle (alle):** første indtægt, første postede video, 3/7/14/30 dage i træk, nået måneds- og profitmål, dag 30/60/90. Én fejring ad gangen, hver kun én gang. Eksisterende brugere får ikke en lavine af gamle milepæle.
- **Venlighed:** ryger en streak på mindst 3 dage, mødes brugeren med en venlig besked og "Tag én opgave nu" – ikke skam.
- **Dagens taknemmelighed (alle):** én linje om dagen under Mission, gemmes kun lokalt.

## 👩👨 Virtuel mor/far/mentor
- Vælg **Mor 👩**, **Far 👨** eller **Mentor 🧑** og et navn (Chat → fanen med figuren, ⚙︎).
- **Gratis for alle:** en daglig besked ud fra tid og tal (morgen/dag/aften/nat, weekend, alle opgaver klaret, indtægt i dag, nået mål, trøst efter en mistet streak). Lokal, samme besked hele dagen. Vises også som widget på hjemmeskærmen.
- **Pro:** chat med figuren via `/api/coach` (`persona`). Varm og støttende, men ærlig; siger ærligt at den er en AI; opmuntrer til kontakt med rigtige mennesker; ingen skyld eller pres.
- **Sikkerhedsnet:** både figuren og den gratis guide henviser til Livslinien (70 201 201) og 112 ved tegn på krise. På engelsk: findahelpline.com.

## 🔊 Blide stemmer (tekst til tale)
- Bruger telefonens egne stemmer (Web Speech API): gratis, ingen server, teksten forlader aldrig telefonen.
- 🔊-knap på dagens besked (også på hjemmeskærmen), mor/far/mentor-svar, coach-svar og guidens beskeder. Tryk igen for at stoppe.
- Blødt: tempo 0,9× som standard (0,7–1,1× under Indstillinger → Stemmer), Mor lidt lysere tone, Far lidt dybere, egen stemme pr. figur (automatisk valg eller manuelt), "Prøv"-knap.
- Teksten renses før oplæsning: emojis, fed skrift og listetegn fjernes, og punkter får pauser imellem.
- Stopper når man skifter skærm eller lukker appen. Browsere uden stemmer får en pæn besked og ingen knapper.
- Mere naturlige stemmer (fx ElevenLabs) kan kobles på senere via en serverfunktion; det kræver en nøgle og koster pr. oplæsning.

## 🗣️ Tal-knap og stemme-tilstand
- **🗣️ Tal** i topbaren (mobil), i sidemenuen (computer) og **"Fortæl mig om min dag"** under uret på hjemmeskærmen: appen fortæller med dine egne tal, hvad du ser (hilsen, klokken, missionsdag, opgaver, streak, profit, mål – og dagens besked på hjemmeskærmen). Tryk igen for at stoppe.
- **Stemme-tilstand** (Indstillinger → Stemmer, slukket som standard): nye svar fra coach, mor/far/mentor og guide læses højt af sig selv.

## 🛡️ Tryghed: SOS, positionsdeling, find mine enheder (`/api/safe`, `netlify/functions/safe.mjs`)
**Samtykke først:** intet spores eller deles uden brugerens eget tryk på sin egen enhed. Man kan kun se andre, der selv har sendt dig et delingslink. REDHUE erstatter ikke 112.
- **SOS (gratis):** hold knappen i 2 sek. (kort tryk sender intet). Appen henter positionen, laver et live-link i 24 timer og en færdig besked → SMS til alle nødkontakter (Android/iPhone-format), WhatsApp, Del eller Kopiér. Brugeren trykker selv Send. "📞 Ring 112" er altid synlig. Virker også uden GPS-tilladelse (uden position). SOS-knap på hjemmeskærmen og i kontrolpanelet.
- **Nødkontakter:** navn + telefon, gemmes kun på telefonen.
- **Del min position (gratis):** 1, 4 eller 24 timer via link; synlig 📍-markering; stop med ét tryk; højst 5 aktive delinger (udløbne ryddes op).
- **Andre med appen (gratis):** dem der har delt deres link med dig – navn, nøjagtighed, sidst opdateret, "Åbn kort". Åbnes et link, tilføjes personen automatisk.
- **Find mine enheder (Pro):** enheder med samme licens, kun hvor "Denne enhed kan findes" er slået til (navn, seneste position, batteri, "Glem").
- **Begrænsning:** web-apps kan kun bruge GPS, mens appen er åben; ellers vises seneste kendte position med tidspunkt.
- **Server:** Netlify Blobs (`redhue-safe`). Enheder identificeres med en tilfældig nøgle, som kun gemmes som hash; licenser og nøgler gemmes aldrig. Delinger udløber og slettes.
- **Til salg (GDPR):** positionsdata er persondata – nævn dem i din privatlivspolitik (formål, opbevaring, sletning).

## 🏥 Sundhed i Danmark (under Tryghed)
- Genveje med ét tryk: **112** (livsfare), **lægevagten/akuttelefonen** for den valgte region (akut sygdom + akut psykisk krise døgnet rundt), **Giftlinjen 82 12 12 12**, **Livslinien 70 201 201**, samt sundhed.dk.
- Regionsnumre (tjekket nov. 2026, Sundhedsstyrelsen): Hovedstaden 1813 · Sjælland 1818 · Syddanmark 70 11 07 07 · Midtjylland 70 11 31 31 · Nordjylland 70 15 03 00. Tjek dem en gang om året.
- Guiden og mor/far/mentor henviser ved krise til Livslinien, regionens lægevagt og 112.
- **Ingen integration med sundhedsvæsenet:** REDHUE henter eller deler ingen sundhedsdata og giver ikke sundhedsråd. En rigtig integration (sundhed.dk, MitID, journaldata) kræver aftaler/godkendelse hos Sundhedsdatastyrelsen, en MitID-broker og kan udløse krav efter MDR (medicinsk udstyr).


## Beta (v0.9.0-beta)

**Til testere:** send dem linket `https://<dit-site>.netlify.app/?beta=BETA-XXXXX-XXXXX` – koden gemmes automatisk og giver Pro gratis til og med 28. februar 2027 (`BETA_UNTIL` i `netlify/lib/shared.mjs`). Kun SHA-256-hashes af koderne ligger i repoet; selve koderne har du fået separat. Ekstra koder uden ny udgivelse: læg hashes kommasepareret i env `REDHUE_BETA_HASHES` (hash = sha256 af `redhue-beta:` + koden).

**Feedback:** «Send feedback» under Indstillinger → Beta, og «Send fejlrapport» i den røde fejlboks. Gemmes i Netlify Blobs (`redhue-feedback`) via `/api/feedback`. Ejeren (din `REDHUE_DEV_KEY` som licens) ser «Feedback-indbakke» samme sted. Ingen IP-adresser gemmes.

**Privatliv:** `privatliv.html` er et udkast med gule pladsholdere (dataansvarlig, CVR, retsgrundlag, overførselsgrundlag, ansvarsbegrænsning, opbevaringstid for feedback). Skal udfyldes, før testere får linket. Fjern derefter `#draftNote`.

### Tjekliste før første tester
1. Netlify: forbind sitet til repo `west33mark-netizen/mark`, branch `redhue`.
2. Netlify env vars: `ANTHROPIC_API_KEY`, `REDHUE_DEV_KEY`, `GUMROAD_PRODUCT_ID` (sidstnævnte kan vente, hvis kun beta-koder bruges).
3. Udfyld `privatliv.html`.
4. Åbn sitet på din egen telefon: installér som app, send én test-feedback, tjek at den står i indbakken.
5. Send beta-links til testerne én for én (én kode pr. person), og notér hvem der fik hvilken.
6. Hæv `VERSION` i `index.html` og `CACHE` i `sw.js` ved hver ny beta-udgivelse.

### Opdateringer (fra 0.9.1-beta)
- Ny udgivelse: hæv `VERSION` i `index.html` og `CACHE` i `sw.js`, og push. Åbne apps finder den nye version inden for 30 min (eller når appen åbnes igen) og viser «Ny version klar · Genstart». Brugerens data røres ikke.
- Indstillinger → Beta: «Søg efter opdatering» og «Genstart app» (rydder cache og genindlæser – hjælper hvis en tester sidder fast).
- Forhåndsvisning (fx i Claude-appen): en bjælke viser, at feedback, AI og deling virker på redhue.netlify.app. Alle API-kald går dertil (`CFG.SITE`), og funktionerne svarer med CORS.

### Offline (fra 0.9.2-beta)
- Alt gemmes på telefonen; appen starter og virker uden net, når den har været åbnet én gang online.
- Uden net vises «📴 Offline». AI-kørsler og feedback lægges i kø (`redhue_outbox`) og sendes automatisk, når nettet er tilbage (AI-svar lander i Historik).
- SOS virker uden internet: GPS-position i SMS'en, og 112 – begge går over telefonnettet.
- Skrifttyper indlæses uden at blokere opstart og gemmes til offline brug. Appen beder browseren om at beskytte sine data mod oprydning.

### Automatik
- **Push til `redhue`** → kvalitetstjek → versionsstempel (så telefoner får «Ny version klar») → nøgler synkroniseres fra GitHub Secrets til Netlify → udgivelse → tjek at siden svarer. Fejler et trin, udgives intet, og GitHub mailer dig.
- **Hver morgen** tjekker «Daglig helbredstjek», at siden og serveren svarer. Fejler den, mailer GitHub dig.
- Nøgler ændres kun ét sted: GitHub → Settings → Secrets and variables → Actions.

## Kanaler: alpha → beta → gamma
| Kanal | Branch | Adresse | Til |
|---|---|---|---|
| **alpha** | `alpha` | https://alpha--redhue.netlify.app | udvikling – alt det nyeste lander her først |
| **beta** | `beta` (og `redhue`) | https://beta--redhue.netlify.app | testere med beta-koder |
| **gamma** | `gamma` | https://redhue.netlify.app | den færdige app |

- Push til en branch udgiver automatisk til dens adresse. Appen viser selv sin kanal (ALPHA/BETA/GAMMA) ved logoet og i Indstillinger → Beta, og feedback mærkes med kanalen.
- **Flyt videre:** GitHub → Actions → «Promovér» → vælg *alpha → beta* eller *beta → gamma* → Run workflow. Kun hurtig-flytning (fast-forward), så en kanal aldrig mister noget.
- Alle kanaler deler nøgler og feedback-indbakke.

## Backend (samlet)
Alle endpoints ligger i `netlify/functions/` og deler `netlify/lib/shared.mjs`: CORS, preflight, licens/beta-tjek, spam-bremse og `endpoint()`-indgangen med fælles fejlhåndtering.

| Endpoint | Hvad | Kræver |
|---|---|---|
| `/api/health` | Status: hvilke dele er klar (viser kun *om* nøgler er sat) | – |
| `/api/agents` | AI-agenter | Pro + `ANTHROPIC_API_KEY` |
| `/api/coach` | AI-coach og mor/far | Pro + `ANTHROPIC_API_KEY` |
| `/api/chat` | Fællesskab | Pro |
| `/api/safe` | Deling, SOS, find enheder | – (find enheder: Pro) |
| `/api/feedback` | Beta-feedback og ejer-indbakke | – (indbakke: ejer) |
| `/api/youtube` | Kanalens offentlige tal og seneste videoer | – (`YOUTUBE_API_KEY` giver abonnenter og @navne) |
| `/api/weather` | Vejr fra DMI: prognose, usikkerhed og målt nu | – (DMI's frie data, ingen nøgle) |

Nye endpoints: `export default endpoint("navn", async (req, ctx) => json(200, {...}), { limit: [60, 60_000] })` og tilføj navnet i `ROUTES`.
Alle nøgler sættes i GitHub Secrets og synkroniseres til Netlify ved hver udgivelse.

### YouTube
Overblik → **YouTube**: indsæt kanal-link, @navn eller kanal-id (UC…). Uden nøgle bruges kanalens offentlige feed (kræver UC-id, ingen abonnenter). Med `YOUTUBE_API_KEY` vises abonnenter, og @navne virker. «Match med pipeline» sætter visninger på kort, hvis titel passer til en video, og flytter dem til Postet. Kun offentlige tal – intet login eller upload.

### Vejr fra DMI
Overblik → **Vejr** og vejret på hjemmeskærmen. Data fra DMI's frie data (`opendataapi.dmi.dk`, ingen nøgle siden 2. dec. 2025):
- **Prognose:** HARMONIE DINI (`harmonie_dini_sf`) for nærmeste punkt, op til 48 timer frem. Temperatur omregnes fra Kelvin, akkumuleret nedbør til mm pr. time, skydække til %.
- **Usikkerhed:** ensemble-percentiler 10/50/90 % (`harmonie_dini_eps_percentiles`) vises som et bånd om temperaturen.
- **Målt nu:** nærmeste DMI-station (metObs, seneste time) med afstand.
- **Gennemsigtighed:** «Hvor kommer tallene fra?» viser kilde, model, parameternavne, enheder, punkt og tidspunkter. Parameternavne slås op i DMI's metadata, så det tåler navneændringer.
- Position afrundes til ca. 5 km og gemmes kun på telefonen. Svar caches 15 min.
