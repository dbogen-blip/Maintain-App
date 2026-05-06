# Maintain – oppsett av varslinger

Skjema og kode er på plass. For å få push og e-post til faktisk å fungere, må du
gjøre noen ting selv (krever en konto hos Resend og noen kommandoer i terminalen).
Følg trinnene i rekkefølge.

## 1. Generer VAPID-nøkler (Web Push)

I terminalen, fra prosjektmappen:

```sh
npx web-push generate-vapid-keys
```

Du får ut en `Public Key` og en `Private Key`. Lim dem inn riktig sted:

**`.env.local`** (frontend leser bare den offentlige):

```
VITE_VAPID_PUBLIC_KEY=<din public key>
```

Etter å ha lagt til, restart `npm run dev`.

## 2. Lag Resend-konto for e-post

1. Gå til https://resend.com og lag en gratiskonto.
2. På dashbordet → API Keys → "Create API Key" (rolle: "Sending access" holder).
3. Kopier nøkkelen (`re_...`).
4. (Valgfritt, men anbefalt:) Verifiser et eget domene under "Domains".
   Uten verifisert domene kan du bare sende til *din egen* registrerte e-post,
   og avsender må være `onboarding@resend.dev`. Det er ok mens du tester.

## 3. Generer en cron-secret

Lag en tilfeldig streng som beskytter Edge Functionen mot å bli kalt av andre:

```sh
openssl rand -base64 32
```

Kopier resultatet — du skal bruke det to steder under.

## 4. Sett alle hemmeligheter på Edge Function

Gå til Supabase Dashboard → **Project Settings → Edge Functions → Secrets**:

https://supabase.com/dashboard/project/thgysqwjcthciqlwjsye/settings/functions

Legg til disse (med dine egne verdier):

| Navn                 | Verdi                                              |
| -------------------- | -------------------------------------------------- |
| `VAPID_PUBLIC_KEY`   | (samme som VITE_VAPID_PUBLIC_KEY)                  |
| `VAPID_PRIVATE_KEY`  | (din private VAPID-nøkkel)                         |
| `VAPID_SUBJECT`      | `mailto:dbogen@hotmail.com`                        |
| `RESEND_API_KEY`     | `re_...`                                           |
| `FROM_EMAIL`         | `Maintain <onboarding@resend.dev>` (til du har eget domene) |
| `CRON_SECRET`        | (strengen fra openssl rand)                        |

`SUPABASE_URL` og `SUPABASE_SERVICE_ROLE_KEY` er allerede tilgjengelige
automatisk inne i Edge Functions, dem trenger du ikke sette.

## 5. Lagre cron-secret i database-vault

Cron-jobben trenger samme secret for å kunne autentisere mot Edge Functionen.
Kjør én gang i SQL Editor i Supabase:

```sql
SELECT vault.create_secret(
  '<cron-secret-strengen-din>',
  'maintain_cron_secret',
  'Shared secret used by pg_cron to authenticate to send-due-reminders'
);
```

Hvis du noen gang vil rotere secret-en:

```sql
UPDATE vault.secrets
SET secret = '<ny-secret>'
WHERE name = 'maintain_cron_secret';
```

## 6. Test Edge Functionen manuelt

Fra terminalen, med `<CRON_SECRET>` byttet ut med strengen din:

```sh
curl -X POST \
  -H "Authorization: Bearer <CRON_SECRET>" \
  https://thgysqwjcthciqlwjsye.supabase.co/functions/v1/send-due-reminders
```

Du bør få JSON tilbake som `{ "ok": true, "push": 0, "email": 0, ... }`
hvis ingen oppgaver forfaller, eller tall hvis det er noen.

## 7. Push-test fra appen

1. Start appen (`npm run dev`).
2. Logg inn → "Innstillinger" → klikk "Skru på push på denne enheten".
3. Aksepter varseltilgang i nettleseren.
4. Lag en oppgave med `last_done` for noen dager siden og kort `interval_days`
   slik at `next_due` er nær.
5. Kjør `curl`-kallet over. Du bør få push-varselet.

## Cron-tidspunkt

Jobben kjører kl. **06:00 UTC** hver dag (= 07:00 norsk vinter / 08:00 norsk sommer).
For å endre, kjør i SQL Editor:

```sql
SELECT cron.unschedule('maintain-send-due-reminders');
SELECT cron.schedule(
  'maintain-send-due-reminders',
  '0 5 * * *',  -- nytt tidspunkt (UTC)
  $$ ... samme body som før ... $$
);
```

## Feilsøking

- **Push virker ikke på iOS**: iOS Safari krever at appen legges til på Hjem-skjermen før push fungerer. Test først i Chrome/Firefox på desktop.
- **Resend gir 403**: Du prøver å sende fra et udokumentert domene. Bruk `onboarding@resend.dev` som `FROM_EMAIL` til du har verifisert et eget domene.
- **Edge Function 401**: `CRON_SECRET` er ikke satt eller `Authorization`-header mangler.
- **Cron kjører ikke**: Sjekk `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;` for siste kjøringer.
