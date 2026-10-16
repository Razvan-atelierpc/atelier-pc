# Modele 3D (Blender)

Aici pui modelele .glb pentru Configurator.

1. În Blender: 1 unitate = 1 cm, originea în centrul piesei, partea vizibilă spre +Z (spre geamul carcasei).
2. File → Export → glTF 2.0, format „glTF Binary” (.glb). Ține fișierul sub ~2 MB.
3. Pe GitHub, în folderul `modele`: Add file → Upload files → tragi fișierul → Commit changes.
4. În `index.html`, la `window.ATELIER_MODELE`, scoți `//` din fața liniei și pui numele fișierului, de ex.
   `"Placă video": "modele/placa-video.glb",`

Numele pieselor: „Placă video”, „Procesor”, „Placă de bază”, „RAM”, „SSD”, „Cooler”, „Sursă”, „Carcasă”.

## Ce e acum aici
`placa-de-baza.glb`, `placa-video.glb`, `ram.glb`, `ssd.glb`, `sursa.glb` – din „Dream Computer Setup” de Daniel Cardona
(https://sketchfab.com/3d-models/dream-computer-setup-82f78bbaf2d34f01af854a52151dbf49), licență CC BY 4.0.
Modificate: fără logo-uri, culori închise, simplificate, comprimate (meshopt + WebP; decodorul e în `vendor/meshopt_decoder.js`).
`ventilator.glb` – din „computer fan” de Temoor (https://sketchfab.com/3d-models/computer-fan-5360bd331c5848eeb9338b4f894e78e5), CC BY 4.0;
rama și paletele înlocuiesc ventilatoarele desenate în cod (nu e în `ATELIER_MODELE`, se încarcă separat în `index.html`).
Autorii sunt trecuți pe `despre.html#credite`. Dacă schimbi modelele, actualizează și acolo.
