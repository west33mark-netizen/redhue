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

