# Safe Scan Eats — iOS e Android

Il progetto è predisposto per Capacitor 8 con un unico codice per Web, iOS e Android.

## Identità app
- Nome: **Safe Scan Eats**
- Bundle/Application ID: `com.safescaneats.app`
- Web app ufficiale: `https://safe-scan-eats.vercel.app`

## Generazione progetti nativi
Su una macchina con Node.js 22+:

```sh
npm install
npx cap add ios
npx cap add android
npm run mobile:sync
```

Per iOS serve macOS con Xcode. Per Android serve Android Studio.

## Aggiornamenti
La shell nativa apre la versione HTTPS ufficiale di Safe Scan Eats, quindi le normali modifiche dell'app pubblicate su Vercel diventano disponibili senza dover ricostruire il pacchetto nativo. Modifiche native, permessi, plugin o requisiti degli store richiedono invece una nuova build e una nuova versione sugli store.

## Prima della pubblicazione
1. Sostituire/approvare icona e splash screen.
2. Preparare privacy policy e scheda App Store / Google Play.
3. Registrare il bundle ID negli account sviluppatore.
4. Generare i progetti `ios/` e `android/`.
5. Testare fotocamera, scanner, CRS, Alexa pairing e link esterni su dispositivi reali.
6. Firmare le build e inviarle agli store.
