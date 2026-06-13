# Card Scanner

Applicazione per **sales** che scansiona biglietti da visita, raccoglie note
testuali/vocali, usa **Claude** per estrarre i campi della scheda lead, mostra
un'anteprima, salva il contatto e consente l'**invio a Salesforce** record per
record con esito (successo / duplicato / errore).

- **Auth**: SSO Microsoft (Entra ID) — l'accesso all'app richiede sempre il login.
- **OCR + analisi AI**: Claude (Anthropic).
- **Trascrizione audio**: provider configurabile (OpenAI Whisper o Azure AI Speech).
- **Salesforce**: integrazione gestita **solo dall'admin** via variabili d'ambiente lato server.
- **Admin**: chi è in `ADMIN_EMAILS` vede i record di **tutti** gli utenti.

> Stato: **scaffold + flusso core**. L'app gira anche senza credenziali reali
> (OCR/analisi/trascrizione/Salesforce hanno fallback "mock"), così puoi provare
> il flusso end-to-end e poi attivare i servizi uno alla volta.

## Stack

Next.js 15 (App Router, TypeScript) · NextAuth · Prisma · PostgreSQL · jsforce · Anthropic SDK.

## Architettura del flusso

```
 Foto biglietto ──► /api/scan (Claude OCR) ──► testo grezzo
 Note testo/audio ─► /api/transcribe (Whisper/Azure) ─► trascrizione
 OCR + note ───────► /api/analyze (Claude) ──► campi scheda lead
 Anteprima/edit ───► /api/leads (POST) ──────► salva su DB (DRAFT)
 Invio ────────────► /api/leads/[id]/send ──► Salesforce (SENT/DUPLICATE/FAILED)
 Admin ────────────► /api/admin/leads ───────► tutti i record (solo admin)
```

## Avvio rapido in locale (zero configurazione)

Per **vedere subito il flusso** senza Postgres, senza Azure e senza API key.
Il DB è SQLite, l'accesso usa un **login di sviluppo** (sola email) e
OCR/analisi/trascrizione/Salesforce girano in modalità **mock**.

```bash
cd card-scanner
cp .env.example .env.local   # i default vanno già bene per il test locale
npm install
npm run db:push              # crea il file SQLite dev.db
npm run dev                  # http://localhost:3000
```

Apri http://localhost:3000 → verrai mandato alla pagina di login:
- inserisci una **email** (usa quella in `ADMIN_EMAILS` per vedere anche `/admin`)
  e un nome, poi **Entra (login di sviluppo)**.
- Prova il flusso: *Scansiona* (carica una foto qualsiasi) → *Note* → *Analizza*
  → *Anteprima* → *Salva e invia*. Con le chiavi assenti vedrai dati mock e
  l'invio Salesforce risponderà "non configurato": è normale.

> Il login di sviluppo è attivo **solo** quando l'SSO Microsoft non è configurato
> e fuori dalla produzione. Appena imposti le variabili `AZURE_AD_*`, l'app passa
> automaticamente al login SSO Microsoft.

## Setup completo (servizi reali)

```bash
cp .env.example .env.local   # compila i valori dei servizi che vuoi attivare
npm run db:push
npm run dev
```

## Configurazione servizi

### 1. Microsoft Entra ID (SSO)
1. Portale Azure → *App registrations* → *New registration*.
2. Redirect URI (Web): `http://localhost:3000/api/auth/callback/azure-ad`
   (e l'URL di produzione).
3. Crea un *client secret*.
4. Compila `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`.

### 2. Admin
Imposta `ADMIN_EMAILS` con le email (separate da virgola) che devono avere
ruolo admin. Solo loro vedono `/admin` e governano l'integrazione Salesforce.

### 3. Claude
`ANTHROPIC_API_KEY` e opzionalmente `ANTHROPIC_MODEL` (default `claude-sonnet-4-6`).

### 4. Trascrizione audio
`TRANSCRIBE_PROVIDER` = `openai` (con `OPENAI_API_KEY`) oppure `azure`
(con `AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION`). Con `none` resta in mock.

### 5. Salesforce (solo admin)
Connected App dedicata con OAuth2 username-password flow. Compila le variabili
`SALESFORCE_*`. Le credenziali restano **solo lato server** e non sono mai
esposte ai sales. L'invio verifica i duplicati per email prima di creare il Lead.

## Deploy su Azure

- **Azure App Service** (Node 20) o **Static Web Apps + API**.
- **Azure Database for PostgreSQL**: in `prisma/schema.prisma` imposta
  `provider = "postgresql"` e in `DATABASE_URL` la stringa del DB Azure.
- Imposta tutte le variabili d'ambiente nella configurazione dell'App Service.
- Aggiorna `NEXTAUTH_URL` e il redirect URI Entra ID con il dominio di produzione.

## Note / prossimi passi

- Storage immagini biglietto: ora salvate come data URL nel DB; in produzione
  conviene Azure Blob Storage (salvare solo la URL/chiave).
- Mapping campi Salesforce personalizzabili (campi custom) in `src/lib/salesforce.ts`.
- Possibile invio massivo (bulk) oltre all'invio singolo già presente.
