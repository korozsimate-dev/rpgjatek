// Room identifiers are also the source for signage, map pins and objective placement.
export const zones = [
  [
    "Eldoria királysága",
    "Kastélyudvar",
    "Királyi kastély|Kovácsműhely|Fegyverbolt|Páncélbolt|Fogadó|Piac|Lakóház|Istálló|Városkapu|Őrtorony|Titkos pince|Könyvtár",
    "Királyi kastély:Alaric király:Az elveszett korona:Maldrak elvitte a koronát. A kovácsom ismeri a titkos utat.|Kovácsműhely:Borin mester:A mester tanácsa:A penge kevés, ha remeg a kéz. A toronyban vár a kiképző.|Őrtorony:Gyakorló lovag:Harci próba:harc|Könyvtár:Pincekulcs:A rejtett kulcs:tárgy|Titkos pince:Rácsos kijárat:A föld alatti út:kapu",
    "Piac:Elveszett csomag:Istálló:Kereskedő|Fogadó:Ezüst serleg:Lakóház:Fogadós",
  ],
  [
    "Cseresznyevirág völgye",
    "Sakura falu",
    "Teaház|Fegyverkereskedés|Nagy szentély|Bambuszerdő|Faház|Kőhíd|Rejtett templom|Kilátó",
    "Teaház:Kenji:A három fény:A bambusz, a híd és a szentély fénye együtt mutat utat. Keleten a nap kel először.|Bambuszerdő:Jáde lámpás:Az első lámpás:tárgy|Kőhíd:Holdlámpás:A második lámpás:tárgy|Nagy szentély:Naplámpás:A harmadik lámpás:tárgy|Rejtett templom:Napkapu:A fény rejtvénye:rejtvény|Kilátó:Árnyharcos:Árnyak párbaja:harc",
    "Faház:Elveszett macska:Kőhíd:Falusi|Nagy szentély:Lótuszvirág:Bambuszerdő:Szerzetes",
  ],
  [
    "Suttogó mocsár",
    "Elsüllyedt falu",
    "Boszorkánykunyhó|Elhagyatott ház|Mocsári kereskedés|Romos templom|Föld alatti barlang|Régi temető|Laboratórium",
    "Boszorkánykunyhó:Morga:A köd titka:Három alapanyag töri meg a barlang átkát. Keresd őket a sírok és a romok között.|Régi temető:Holdgomba:Az első alapanyag:tárgy|Romos templom:Ködgyökér:A második alapanyag:tárgy|Elhagyatott ház:Lidércfű:A harmadik alapanyag:tárgy|Föld alatti barlang:Mocsári rém:A barlang őre:harc",
    "Boszorkánykunyhó:Titkos recept:Laboratórium:Tanítvány|Mocsári kereskedés:Eltűnt utazó:Föld alatti barlang:Révész",
  ],
  [
    "Lávakirályság",
    "Piazza del Fuoco",
    "Kovácsműhely|Fegyverbolt|Piactér|Vulkanikus bánya|Lávahíd|Elhagyatott kastély|Tűztemplom",
    "Kovácsműhely:Dante:A tűz szíve:Nyisd ki a három szelepet, mielőtt a hegy felébred.|Vulkanikus bánya:Rézszelep:A bánya szelepe:tárgy|Lávahíd:Vasszelep:A híd szelepe:tárgy|Elhagyatott kastély:Aranyszelep:A kastély szelepe:tárgy|Tűztemplom:Lávagólem:A hegy őre:harc|Tűztemplom:Tűzkristály:A parázs öröksége:tárgy",
    "Kovácsműhely:Ritka érc:Vulkanikus bánya:Ércmester|Piactér:Tűzopál:Lávahíd:Ékszerész",
  ],
  [
    "Sárkánykastély",
    "A fekete udvar",
    "Nagy kapu|Trónterem|Börtön|Könyvtár|Fegyverterem|Királyi lakosztály|Titkos laboratórium|Kincseskamra|Sárkányfészek|Végső aréna",
    "Királyi lakosztály:Elena hercegnő:A fogoly örökös:Maldrak nem mindig volt zsarnok. Olvasd el a naplóját.|Könyvtár:Maldrak naplója:Az elfeledett múlt:tárgy|Titkos laboratórium:Lánckulcs:A láncok kulcsa:tárgy|Sárkányfészek:Megláncolt sárkány:Az utolsó szövetséges:kapu|Végső aréna:Maldrak:A bukott király:harc",
    "Trónterem:Rejtett láda:Kincseskamra:Kincstárnok|Nagy kapu:Fogoly lovag:Börtön:Kapitány",
  ],
].map(([name, hub, r, q, s]) => ({
  name,
  hub,
  rooms: r.split("|"),
  steps: q.split("|").map((v) => v.split(":")),
  side: s.split("|").map((v) => v.split(":")),
}));
export const goods = [
  ["Vas kard", 30, 8],
  ["Acél kard", 70, 13],
  ["Mágikus kard", 120, 19],
  ["Tűzpenge", 150, 25],
  ["Bőrvért", 40, 3],
  ["Vas páncél", 80, 5],
  ["Lovagi páncél", 130, 8],
  ["Mágikus páncél", 180, 11],
  ["Kis gyógyital", 10, 25],
  ["Nagy gyógyital", 20, 65],
  ["Manaital", 15, 40],
  ["Tűzellenállás ital", 25, 4],
  ["Erőnövelő ital", 25, 8],
];
export const fresh = () => ({
  z: 0,
  q: 0,
  hp: 100,
  mp: 60,
  gold: 85,
  bag: { 8: 2 },
  weapon: -1,
  armor: -1,
  buff: 0,
  ward: 0,
  side: {},
  keys: [],
  kills: 0,
  secs: 0,
  ending: "",
  room: "",
  x: 0,
  y: 14,
});
export function buy(s, i) {
  if (!goods[i] || s.gold < goods[i][1]) return false;
  s.gold -= goods[i][1];
  s.bag[i] = (s.bag[i] || 0) + 1;
  return true;
}
export function use(s, i) {
  i = +i;
  if (!s.bag[i]) return;
  if (i < 4) s.weapon = i;
  else if (i < 8) s.armor = i;
  else {
    --s.bag[i];
    if (i < 10) s.hp = Math.min(100, s.hp + goods[i][2]);
    if (i === 10) s.mp = Math.min(60, s.mp + 40);
    if (i === 11) s.ward = 5;
    if (i === 12) s.buff = 5;
  }
}
