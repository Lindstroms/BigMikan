# Big Mikan - Tilmelding

En lille tilmeldingsapp til besætningen på sejlbåden **Big Mikan**, som
erstatter den nuværende proces med et Word-dokument, der sendes rundt pr.
mail. Alle i besætningen kan selv registrere, om de deltager i sæsonens
sejladser, og Lars har et samlet, altid opdateret overblik.

**Sådan virker det:**
1. Man går ind på sitet og vælger sit eget navn.
2. For hver sejlads trykker man "Deltager", "Måske" eller "Deltager ikke" -
   det gemmes med det samme, ingen "send"-knap.
3. Lars ser alt i et samlet skema under **Overblik**, kan låse op med en
   kode og markere hvem der er endeligt **bekræftet**, tilføje nye
   sejladser/besætningsmedlemmer, og eksportere til CSV/Excel.

Ingen login med kodeord for besætningen - kun ved at vælge sit eget navn i
en liste (se "Sikkerhedsmodel" nedenfor for hvad det betyder i praksis).

## Teknologi

- [Next.js](https://nextjs.org/) (App Router, statisk export) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (gratis Postgres-database) som eneste
  "backend" - appen snakker direkte med Supabase fra browseren, så der er
  ingen server at drifte. Det betyder også at appen kan hostes som en helt
  almindelig statisk hjemmeside, fx på GitHub Pages, ligesom `m7N-app`.

## Kom i gang - trin for trin

### 1. Opret et gratis Supabase-projekt

1. Gå til [supabase.com](https://supabase.com/) og opret en gratis konto.
2. Opret et nyt projekt (vælg fx region "Frankfurt" for lav latency i DK).
3. Vent til projektet er klar (tager ca. 1-2 minutter).

### 2. Opret databasetabellerne

1. Gå til **SQL Editor** i Supabase-projektet.
2. Åbn filen [`supabase/schema.sql`](./supabase/schema.sql) i dette repo,
   kopiér hele indholdet ind i SQL Editor, og tryk **Run**.
3. Det opretter tre tabeller (`crew_members`, `activities`, `signups`) samt
   adgangsregler (RLS-policies) - se forklaringen i selve filen.

### 3. Find dine nøgler

I Supabase: **Project Settings → API**. Du skal bruge:
- **Project URL** (fx `https://xxxxxxxxxxxx.supabase.co`)
- **anon public key**

### 4. Kør appen lokalt (valgfrit, men rart til at teste)

Kræver Node.js 18.18+ og npm.

```bash
cp .env.example .env.local
# udfyld NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# og NEXT_PUBLIC_LARS_CODE i .env.local

npm install
npm run dev
# åbn http://localhost:3000
```

### 5. Udgiv på GitHub Pages

1. Under repoets **Settings → Secrets and variables → Actions**, tilføj tre
   *repository secrets*:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_LARS_CODE` (den kode Lars bruger for at låse Overblik op)
2. Under **Settings → Pages**, vælg **Source: GitHub Actions** (kun
   nødvendigt én gang).
3. Push til `main` (eller kør workflowet manuelt under **Actions** →
   "Deploy to GitHub Pages" → **Run workflow**).
4. Appen er derefter tilgængelig på:
   ```
   https://lindstroms.github.io/BigMikan/
   ```

Da appen er 100% statisk, kan den i stedet hostes på Vercel/Netlify uden
ændringer, hvis det foretrækkes - så skal `GITHUB_PAGES`-miljøvariablen og
`basePath`/`assetPrefix` i `next.config.mjs` bare udelades/tilpasses.

### 6. Tilføj besætning og sæsonens sejladser

Gå ind på **/overblik**, lås op med `NEXT_PUBLIC_LARS_CODE`, og tilføj
besætningsmedlemmer og sejladser via formularerne nederst på siden. Herefter
kan alle vælge deres navn på forsiden og tilmelde sig.

## Statusser

| Status | Betydning |
|---|---|
| Mangler svar | Ingen har svaret endnu (standard) |
| Tilmeldt | Personen har meldt sig til |
| Måske | Personen er usikker |
| Bekræftet | Lars har bekræftet pladsen (sættes i Overblik) |
| Deltager ikke | Personen deltager ikke |

## Sikkerhedsmodel - læs dette

Dette er bevidst en **simpel, tillidsbaseret app til en lukket vennekreds**,
ikke en app med rigtig brugerstyring:

- Der er **intet login**. Man "er" den man vælger i listen - der er intet,
  der forhindrer at man (ved en fejl eller med vilje) vælger en andens navn.
- `NEXT_PUBLIC_LARS_CODE` er **ikke en rigtig adgangskontrol**. Fordi appen
  er 100% statisk uden server, ligger koden i den offentlige JavaScript, som
  enhver kan finde ved at kigge i browserens udviklerværktøjer. Den er kun
  en blid spærre mod at besætningen roder i sejladser/besætningsliste ved et
  uheld - ikke en sikkerhedsforanstaltning.
- Databasen har åbne adgangsregler (RLS-policies tillader alle at
  læse/skrive med den offentlige "anon"-nøgle), fordi der ikke er nogen
  server til at håndhæve, hvem der er hvem.
- **Læg derfor ikke følsomme personoplysninger i databasen** (cpr-numre,
  adresser mv.) - hold det til navn og evt. telefon/mail, ligesom det
  nuværende Word-ark allerede gør.

Hvis behovet senere vokser (flere hold, følsomme data, rigtig
adgangskontrol), er næste naturlige skridt Supabase Auth (fx magic-link
login pr. mail) og stramme RLS-policies pr. bruger.

## Filstruktur

```
app/
  layout.tsx              Root-layout, navigation
  page.tsx                Forside - vælg dit navn
  mig/page.tsx             Wrapper (Suspense) om MigClient
  overblik/page.tsx        Wrapper om OverblikClient
components/
  MigClient.tsx            Tilmeldingsside for én person
  OverblikClient.tsx        Matrix-overblik + admin (lås op, tilføj/slet)
  SetupNotice.tsx           Vises hvis Supabase ikke er konfigureret endnu
lib/
  types.ts                  Domænetyper
  status.ts                 Statuslabels, farver, rækkefølge
  supabaseClient.ts          Supabase-klient (browser-side)
supabase/
  schema.sql                 Databaseskema + RLS-policies
```

## Hvad er implementeret vs. muligt at udvide senere

**Implementeret:**
- Vælg navn → se sæsonens sejladser → tilmeld/afmeld/måske med ét klik,
  gemmes øjeblikkeligt i databasen.
- Notat-felt pr. tilmelding (fx "kommer først lørdag"), synligt for Lars som
  et hover-tooltip på cellen i Overblik.
- "Tilføj til kalender" (.ics) pr. sejlads eller for alle ens tilmeldte
  sejladser samlet.
- Overblik som matrix (besætning × sejladser), CSV-eksport.
- Besætningsliste pr. sejlads i Administration - se/kopiér hvem der er
  tilmeldt/måske til én bestemt sejlads (til fx havnekontor eller
  stævneledelse).
- Lås op med kode for at kunne ændre status pr. celle (inkl. "Bekræftet"),
  tilføje/deaktivere/redigere/slette besætningsmedlemmer, tilføje/redigere/
  slette sejladser.

**Ikke inkluderet i denne version (mulige næste skridt):**
- Automatiske reminder-mails før en sejlads (kræver en mail-tjeneste og en
  serverless function - appen har i dag ingen backend).
- Rigtig login/adgangskontrol (Supabase Auth).
- Historik/log over hvem der har ændret hvad og hvornår.
