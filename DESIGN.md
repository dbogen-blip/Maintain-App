# Maintain – design system

Premium SaaS-tema: rolig, ren, mobile-first, kortbasert layout med myke
skygger og runde hjørner. Alle visuelle valg lever som CSS-variabler i
`src/theme.css`. **Endre tokenet, ikke komponenten** når noe skal justeres.

## Brand

| Bruk | Token | Hex |
|------|-------|-----|
| Hovedmerkefarge / primærknapp | `--color-navy` | `#0F172A` |
| Hover på primær | `--color-navy-700` | `#1e293b` |
| Lenker / sekundær handling | `--color-link` | `#2563EB` |
| Lenke-hover | `--color-link-700` | `#1d4ed8` |

## Status

| Status | Token | Hex |
|--------|-------|-----|
| OK / fullført | `--color-success` | `#22C55E` |
| Forfaller snart | `--color-warning` | `#F59E0B` |
| Forfalt / destruktiv | `--color-danger` | `#EF4444` |

## Nøytrale

| Bruk | Token | Hex |
|------|-------|-----|
| App-bakgrunn | `--color-bg` | `#F8FAFC` |
| Kort, modal | `--color-surface` | `#FFFFFF` |
| Subtle hover/empty | `--color-surface-alt` | `#F1F5F9` |
| Border (default) | `--color-border` | `#E5E7EB` |
| Border (input) | `--color-border-strong` | `#D1D5DB` |
| Tekst – primær | `--color-text` | `#111827` |
| Tekst – sekundær | `--color-text-muted` | `#6B7280` |
| Tekst – hint | `--color-text-soft` | `#9CA3AF` |

## Spacing (4-punkt grid)

`--space-1` (4 px) → `--space-16` (64 px). Bruk alltid token, aldri rå piksler.

| Mellomrom | Bruk |
|-----------|------|
| `--space-2` | gap mellom ikon og tekst, små klistrebytter |
| `--space-3` | mellom feltlinjer, mellom ikon og chip |
| `--space-4` | gap mellom kort, mellom seksjoner |
| `--space-5` | padding inni kort |
| `--space-6` | margin under sideheader |
| `--space-8` | toppluft over store overskrifter |

## Radii

- `--radius-sm` (6 px) – pills, små badges
- `--radius-md` (8 px) – knapper, inputs
- `--radius-lg` (14 px) – **default for kort**
- `--radius-xl` (20 px) – modaler
- `--radius-2xl` (24 px) – store CTA-kort
- `--radius-full` – sirkler, chips

## Skygger

Myke, multilags. Bruk:

- `--shadow-xs` – kort i ro (knapt synlig)
- `--shadow-sm` – kort default
- `--shadow-md` – kort på hover, dropdowns
- `--shadow-lg` – modaler, popovers

## Typografi

System-stack (San Francisco på iOS/Mac, Segoe på Windows). H1/H2 bruker
deep navy + tightere letter-spacing for premium-følelse. Brødtekst er
1 rem / 1.5 line-height.

## Komponenter

Alle ligger i `src/components/`:

| Komponent | Bruk |
|---|---|
| `<Button>` | `variant`: `primary` (navy), `secondary` (hvit/border), `ghost` (transparent), `danger` (rødtonet). `size`: `sm`, `md`. `icon` valgfritt. |
| `<Card>` | Hvit boks med myke skygger. `padding` 3/4/5/6. Default 5. |
| `<Modal>` | Dialog med backdrop. Mobile slide-up. |
| `<Input>` / `<Textarea>` / `<Select>` / `<Checkbox>` | Skjemafelt med label, hint og error. |
| `<Badge>` | `variant`: `neutral`, `success`, `warning`, `danger`. |
| `<EmptyState>` | Ikon + tittel + beskrivelse + CTA. |
| `<Spinner>` | Tres animerte prikker. `size`: `sm`, `md`, `lg`. Brukes for loading-states. |
| `<Icon name="..." />` | SVG-ikon fra registry i Icon.jsx. |
| `<FileUpload>` | Generisk uploader (bilder/PDF/dok). Eksisterende vedlegg vises som thumbnails/lenker. |

## Ikoner

Inline SVG i Lucide-stil (24×24, stroke 2). Ligger i `Icon.jsx`. For nye:
kopier `d`-attribut fra https://lucide.dev og legg i `ICONS`-objektet.

Brukte navn (kategorier osv.):
`wrench, plus, minus, check, x, trash, edit, settings, bell, calendar,
clock, search, filter, user, logout, arrowLeft, arrowRight, chevronDown,
chevronRight, alertCircle, alertTriangle, image, upload, car, home,
boat, history, list, more, refresh`.

## Skjemaer

I `src/forms/`:
- `AssetForm` – opprett/rediger eiendel (med bildeupload)
- `TaskForm` – opprett/rediger oppgave (med beskrivelse + vedlegg)
- `LogForm` – marker som utført + bilder fra utførelsen

Mønster: opprett rad i database først hvis det trengs en `id` for upload,
deretter kjør form-saving som oppdatering.

## Mobile-first

- Container har `padding-bottom: env(safe-area-inset-bottom)` så PWA
  ikke kolliderer med home-bar på iOS.
- Modaler glir opp fra bunn på små skjermer (< 640 px).
- Asset-grid er `auto-fill, minmax(240px, 1fr)` — én kolonne på mobil,
  flere på desktop uten media queries.
- Kort er klikkbare i sin helhet — egnet for tap.

## Aldri gjør dette

- ❌ Hex-koder direkte i komponenter — bruk variabler.
- ❌ `prompt()`/`alert()` for input — bruk `<Modal>` + `<Input>`.
- ❌ Hardkode pikselverdier — bruk `--space-*`-tokens.
- ❌ Knapper uten `<Button>`-wrapping — bruk komponenten for konsistens.
- ❌ Nye farger uten å legge dem i `theme.css` først.
