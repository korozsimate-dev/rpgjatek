# The Fallen Crown

Magyar nyelvű, böngészős, külső szervert nem igénylő fantasy RPG. Az illusztrált nyitóképernyőről a **Kaland indítása** nyitja meg a valós idejű Three.js-világot. WebGL 2 szükséges.

```sh
npm ci
npm run dev
```

**Irányítás:** WASD vagy fel/le nyíl: mozgás; bal/jobb nyíl vagy egérhúzás: kamera; Shift: futás; E vagy a közelségi felirat: interakció. I: leltár; J: napló. A minitérképpel a már felfedezett fejezetek között utazhatsz. Az éppen aktuális cél aranyszínű jelölést kap. A mellékfeladatoknál a napló a megbízót, a célhelyet és a visszatérési helyet is megadja.

**Harc:** körökre osztott párbaj, kardcsapással, mágiával, hárítással és gyógyitallal. A nagy csapást előzetes figyelmeztetés jelzi. A felszerelést vásárlás után a leltárban kell felölteni. Vereség után a településen ébredsz; a kulcsok és a történethaladás megmaradnak.

**Mentés:** automatikus helyi mentés területváltás, jutalom és vásárlás után, valamint játék közben időszakosan. A Mentés gomb kézi mentést készít ugyanabba a foglalatba. A játék ugyanazon böngészőben és webcímen folytatható; a webhely adatainak törlése törli a mentést. A félbehagyott párbaj újrakezdődik.

## Ellenőrzés

- `npm test`: helyszínhivatkozások, mellékküldetések, aranyellenőrzés, leltár és használható tárgyak.
- `npm run build`: kiadható statikus webhely a `dist/` könyvtárban.
- Futó fejlesztői szerver mellett (`localhost:5173`): `node scripts/check-browser.mjs` – valódi WebGL indítás, mozgás, mentés és folytatás; `node scripts/check-story.mjs` – öt fejezet, az összes fő cél és tíz mellékküldetés, vásárlás, felszerelés, győzelem és három befejezés. A történetteszt a gyaloglást gyorsítja, ezért nem játékidőmérés. A tesztek Linux headless Chromium környezetet és annak rendszerkönyvtárait igénylik.

## Források

- [KayKit: Adventurers](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0), Kay Lousberg, CC0. Textúrázott, csontvázas modellek; ebben a kiadásban válogatott animációkkal. Licenc: `public/models/LICENSE.txt`.
- Lucide ikonok: ISC (`public/icons/LICENSE`). Egyedileg generált nyitóillusztráció; a bejárható világ épületei, berendezései és felületei helyben készülnek.
