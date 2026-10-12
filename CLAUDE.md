# Atelier PC – reguli pentru Claude

Site static (GitHub Pages) de comparare prețuri și recomandări pentru componente PC, în română.
Site: https://razvan-atelierpc.github.io/atelier-pc/

## Cine schimbă ce
- `date.js` îl generează **botul** (Python + Telegram) de pe PC-ul lui Răzvan (`C:\Users\User\pc-bot\site`) și îl urcă singur. Nu-l edita de mână.
- Restul fișierelor (`*.html`, `comun.js`, `note-ai.js`, `vendor/`, `modele/`) le schimbă Claude direct în repo.
- Atenție: botul urcă și fișierele din folderul lui local. După fiecare schimbare la pagini, amintește-i lui Răzvan să copieze ZIP-ul de pe GitHub în `pc-bot\site`, altfel botul pune versiunea veche peste cea nouă. Ținta: botul să urce doar `date.js`.
- Înainte de push: `git fetch` + `rebase` (botul face commit-uri „Atelier PC: actualizez date.js”). Dacă vezi un commit al botului care modifică `index.html`/`montaj.html`, verifică dacă n-a suprascris o versiune mai nouă.

## Reguli
- Textele de pe site: română simplă, fără jargon, propoziții scurte. Diacritice corecte (ș, ț cu virgulă).
- Notele merg de la S (cel mai bun) la F; profiluri: `gaming`, `creatie`, `ai`.
- `note-ai.js` se încarcă imediat după `date.js` (calculează nota „AI local” în pagină).
- 3D: three.js r128 de pe cdnjs + `vendor/three-extra-r128.js`. Culorile se dau în sRGB și se trec prin `lin()`.
- Orice schimbare se verifică și pe telefon (390 px lățime), nu doar pe calculator.
- Site-ul e neutru față de mărci: preferințele personale ale lui Răzvan (ex. fără plăci MSI) țin doar de botul și PC-ul lui, nu de site.
- Linkurile de afiliere au `rel="sponsored"`; notele nu depind de comision.

## Pagini
- `index.html` – Configurator 3D: piese, oferte, Flux de aer, Poți rula AI?, Aranjează PC-ul (+ monitoare).
- `montaj.html` – ghid de montaj pas cu pas în 3D.
- `reduceri.html`, `pc-uri.html`, `pc-ul-meu.html`, `despre.html`.
- Modele din Blender: `.glb` în `modele/`, trecute în `window.ATELIER_MODELE` din `index.html` (vezi `modele/CITESTE.md`).
