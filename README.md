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

