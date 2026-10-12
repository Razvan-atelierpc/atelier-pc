# atelier-pc.
Atelier PC – site de comparare prețuri și recomandări pentru componente PC: configurator 3D, note S–F pentru fiecare produs (jocuri / editare), detectarea reducerilor reale față de istoricul de 30 de zile, PC-uri recomandate pe buget și ghid de montaj. Linkurile duc direct la produs, cu mențiunea clară că sunt de afiliere.

## Modele 3D din Blender

Configuratorul (index.html) desenează piesele în cod, dar fiecare poate fi înlocuită cu un model făcut în Blender:

1. În Blender lucrezi în centimetri (1 unitate = 1 cm), cu originea în centrul piesei și partea vizibilă spre +Z (spre geamul carcasei).
2. Export: File → Export → glTF 2.0, format „glTF Binary” (.glb). Ține modelul sub ~2 MB.
3. Pui fișierul în `modele/` și îl treci în `window.ATELIER_MODELE` din index.html, de ex. `"Placă video": "modele/placa-video.glb"`.

Conturul piesei alese și estomparea restului merg automat și pe modelele încărcate.
