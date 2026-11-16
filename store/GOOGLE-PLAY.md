# REDHUE på Google Play

Alt, der kan forberedes uden en Play-konto, ligger her. Teksterne er klar til at kopiere ind i Play Console.

## Butikstekster

### Dansk (standard)
**App-navn** (højst 30 tegn): `REDHUE – Creator OS`

**Kort beskrivelse** (højst 80 tegn):
`90-dages mission for faceless creators: idéer, AI-agenter, profit og pipeline.`

**Fuld beskrivelse** (højst 4000 tegn):
```
REDHUE er dit eget creator-styresystem til faceless videoer på TikTok, Reels og YouTube Shorts.

Sæt et månedsmål, og følg en 90-dages mission med fire små opgaver om dagen. REDHUE holder styr på idéer, produktion og postede videoer, viser din profit og fejrer dine milepæle.

MISSION OG OVERBLIK
• 90-dages indkomstmission med daglige opgaver og streak
• Pipeline fra idé til postet video
• Wallet med indtægter, udgifter og margin
• YouTube-kanalens offentlige tal direkte i appen

AI-AGENTER
• Script-agent, Hook & Caption, Planlægger og Analytiker
• Grafik-agent: thumbnails, farver og billed-prompts – lærer dit brand af dine 👍 og 👎
• AI-coach og en varm, støttende mor/far-stemme (det er en AI, ikke en person)

SMÅ APPS TIL HVERDAGEN
• Sanglære med opvarmning og stemmemåler
• Nyhedslære: læs nyheder klogt
• Billige, lette opskrifter med indkøbsliste
• Tryg dating: tjekliste, date-plan og tjek-ind
• Genbrug: hvor skal det hen? Pant og de 10 affaldstyper
• Stamtræ og hygiejneplan

TRYGHED OG VEJR
• SOS-knap, der sender din position som SMS til dine nødkontakter
• Vejr fra DMI med usikkerhed og målinger fra nærmeste station

PRIVAT OG OFFLINE
Dine data ligger på din telefon. Appen virker uden net, tager automatisk kopier af dine data og kan læse op med blide stemmer.

REDHUE Pro låses op med en licensnøgle.

SOS-funktionen er ikke en nødtjeneste. Ring altid 112 ved fare for liv og helbred.
```

### English
**App name**: `REDHUE – Creator OS`

**Short description**:
`A 90-day mission for faceless creators: ideas, AI agents, profit and pipeline.`

**Full description**:
```
REDHUE is your own creator operating system for faceless videos on TikTok, Reels and YouTube Shorts.

Set a monthly goal and follow a 90-day mission with four small tasks a day. REDHUE tracks ideas, production and posted videos, shows your profit and celebrates your milestones.

MISSION AND OVERVIEW
• 90-day income mission with daily tasks and streak
• Pipeline from idea to posted video
• Wallet with income, costs and margin
• Your YouTube channel's public numbers in the app

AI AGENTS
• Script agent, Hook & Caption, Planner and Analyst
• Graphics agent: thumbnails, colours and image prompts – learns your brand from your 👍 and 👎
• AI coach and a warm, supportive mom/dad voice (it is an AI, not a person)

SMALL EVERYDAY APPS
• Singing practice with warm-up and pitch meter
• News sense: read the news wisely
• Cheap, easy recipes with shopping list
• Safe dating: checklist, date plan and check-in
• Recycling guide, family tree and hygiene plan

SAFETY AND WEATHER
• SOS button that texts your location to your emergency contacts
• Weather from DMI (Denmark) with uncertainty and nearby station readings

PRIVATE AND OFFLINE
Your data stays on your phone. The app works offline, saves automatic copies and can read aloud with gentle voices.

REDHUE Pro is unlocked with a license key.

The SOS feature is not an emergency service. Always call your local emergency number when life or health is at risk.
```

## Grafik (i mappen `store/`)
| Fil | Bruges til | Størrelse |
|---|---|---|
| `graphics/icon-512.png` | App-ikon | 512 × 512 |
| `graphics/feature-graphic-1024x500.png` | Feature graphic | 1024 × 500 |
| `screens/phone-1.png` … `phone-6.png` | Telefon-screenshots | 1080 × 1920 |
| `screens/wide-1.png` | Tablet/bred visning | 1920 × 1080 |

Screenshots viser eksempeldata (navnet "Mark" og eksempelindtægter), ikke rigtige kunders tal.

## Datasikkerhed (Data safety) – udkast
Gennemgå svarene, før de sendes. Du er dataansvarlig.

| Spørgsmål | Svar | Hvorfor |
|---|---|---|
| Indsamler eller deler appen brugerdata? | Ja | AI-prompts, chat og position ved deling sendes til serveren |
| Er alle data krypteret under overførsel? | Ja | Kun HTTPS |
| Kan brugere bede om sletning? | Ja | Data ligger lokalt (Nulstil alt); serverdata via kontakt-mail |
| Position – omtrentlig og præcis | Indsamles, valgfri, til appens funktion | Kun ved SOS, deling og "Find mine enheder" |
| Personlige oplysninger – navn | Indsamles, valgfri | Visningsnavn i fællesskabs-chat |
| Beskeder – andre beskeder i appen | Indsamles, valgfri | Chat og feedback |
| Lyd – stemme | Indsamles ikke | Stemmemåleren behandler lyd kun på telefonen |
| Appaktivitet – anden brugerindhold | Indsamles, valgfri | Tekst sendt til AI-agenter (behandles af Anthropic, gemmes ikke af REDHUE) |
| Delt med tredjeparter | Ja: Anthropic (AI), Netlify (hosting), Gumroad (licens) | Behandlere – se privatliv.html |
| Bruges data til reklame? | Nej | |

## Sådan gør du (rækkefølge)

### 1. Før Play-kontoen (kan gøres nu)
- [ ] REDHUE skal køre på redhue.netlify.app med alle 8 serverdele (Netlify forbundet til GitHub: redhue → main).
- [ ] Udfyld de gule felter i `privatliv.html` (dataansvarlig, CVR, kontakt-mail). Google kræver et link til privatlivspolitikken: `https://redhue.netlify.app/privatliv.html`.

### 2. Google Play-konto
- [ ] Opret en udviklerkonto på play.google.com/console (engangsgebyr; personlig konto kræver ID-bekræftelse).
- [ ] Som ny personlig konto: kør en **lukket test med mindst 12 testere i 14 dage i træk**, før du kan søge om udgivelse. Brug de 30 beta-koder til testerne.

### 3. Lav Android-pakken (uden Mac, uden Android Studio)
- [ ] Åbn **pwabuilder.com**, indtast `https://redhue.netlify.app`, og vælg **Package for stores → Android**.
- [ ] Package ID: `app.netlify.redhue.twa` · App name: `REDHUE` · Start URL: `/index.html?app=play#home` (så skjuler appen købsknapperne).
- [ ] Hent pakken. Den indeholder en `.aab`-fil til Play og en signeringsnøgle – **gem nøglen sikkert**, den kan ikke genskabes.

### 4. Forbind app og hjemmeside
- [ ] I Play Console → App integrity → App signing: kopiér **SHA-256-fingeraftrykket**.
- [ ] Send det til Claude, så indsættes det i `/.well-known/assetlinks.json`. Uden det vises en adresselinje øverst i appen.

### 5. Udfyld og send
- [ ] Butikstekster og grafik herfra, kategori **Produktivitet**, kontakt-mail, privatlivslink.
- [ ] Datasikkerhed (udkastet ovenfor), indholdsvurdering, målgruppe 18+ (dating- og AI-funktioner).
- [ ] Upload `.aab` til lukket test → efter 14 dage: ansøg om produktion.

## Betaling for Pro
- Butiks-appen viser **ingen købsknapper** (styres af `?app=play` i start-URL'en). Pro låses op med licensnøgle.
- Vil du sælge Pro inde i appen, kræver Google Play Billing – eller deltagelse i EØS-programmet "billing choice" (eget betalingssystem eller link ud), hvor Google tager et gebyr. Det kræver tilmelding og kode i appen og er ikke lavet endnu.
- Tjek Googles betalingsregler for licensnøgler købt uden for appen, før du udgiver.

## Apple App Store
Ikke forberedt endnu. Apple kræver normalt deres eget køb i appen, når en app låser betalt indhold op (regel 3.1.1/3.1.3), og en iOS-app skal bygges og sendes fra en Mac (eller en byggetjeneste i skyen). Gør Google Play først.
