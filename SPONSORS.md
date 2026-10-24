# Barra sponsor di Safe Scan Eats

La barra è pronta ma disattivata: nessuna azienda è presentata come sponsor senza un accordo. Non dipende da AdSense e non genera ricavi automaticamente.

## Attivazione dopo l'accordo

Modificare `src/config/sponsor.json` con `enabled: true`, il nome dell'azienda, un collegamento HTTPS concordato e un breve messaggio facoltativo. Poi eseguire la build e pubblicare. Per rimuovere lo sponsor impostare `enabled: false` e ripubblicare. Nome massimo 80 caratteri, messaggio massimo 160. Dati incompleti o URL non validi nascondono la barra.

Prima della pubblicazione concordare per iscritto il compenso, la durata, il testo e la destinazione del link, l'eventuale uso del marchio e le modalità di pagamento. Il componente attuale mostra il nome in testo, senza loghi esterni. Alla scadenza disattivare la campagna e ripubblicare; non è prevista scadenza automatica.

## Comportamento

- Barra in alto nel normale flusso della pagina: non copre contenuti o controlli.
- Etichetta visibile «Sponsor · Pubblicità», in italiano o inglese secondo la lingua dell'app.
- Nascosta durante scansione del codice a barre e acquisizione ingredienti.
- Collegamento in una nuova scheda con `rel="sponsored noopener noreferrer"` e senza referrer.
- Nessun pixel, cookie, script, immagine remota o conteggio di clic pubblicitario aggiunto.
- Configurazione uguale per tutti: nessun uso di profili, allergie, prodotti scansionati o lista della spesa per selezionare lo sponsor.
- L'eventuale sito esterno applica le proprie condizioni dopo l'apertura. Questa integrazione non invia dati dell'app alla destinazione; eventuali parametri inseriti manualmente nell'URL vanno controllati prima della pubblicazione.

## Ricerca dello sponsor

Possibili contatti sono negozi online, supermercati e marchi alimentari. Presentare i dati aggregati reali di utilizzo disponibili, la posizione della barra e la durata proposta. Non promettere vendite o un numero di visualizzazioni che non è misurato. Non presentare sponsorizzazione come garanzia di compatibilità alimentare.

La candidatura a piattaforme pubblicitarie automatiche rimane un'attività distinta: questa modifica non aggiunge AdSense, non richiede codici Google e non rappresenta un accordo commerciale già ottenuto.
