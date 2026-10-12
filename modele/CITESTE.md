# Modele 3D (Blender)

Aici pui modelele .glb pentru Configurator.

1. În Blender: 1 unitate = 1 cm, originea în centrul piesei, partea vizibilă spre +Z (spre geamul carcasei).
2. File → Export → glTF 2.0, format „glTF Binary” (.glb). Ține fișierul sub ~2 MB.
3. Pe GitHub, în folderul `modele`: Add file → Upload files → tragi fișierul → Commit changes.
4. În `index.html`, la `window.ATELIER_MODELE`, scoți `//` din fața liniei și pui numele fișierului, de ex.
   `"Placă video": "modele/placa-video.glb",`

Numele pieselor: „Placă video”, „Procesor”, „Placă de bază”, „RAM”, „SSD”, „Cooler”, „Sursă”, „Carcasă”.
