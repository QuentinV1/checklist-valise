// Valise — Checklist Voyage Moderne (2026)
const STORAGE_KEY = 'valise_app_data_v4';
const LEGACY_STORAGE_KEY_V3 = 'valise_app_data_v3';
const LEGACY_STORAGE_KEY_V2 = 'valise_app_data_v2';
const THEME_KEY = 'valise_theme';

let appState = {
  trips: [],
  activeTripId: null,
  customTemplates: [],
  viewMode: 'chrono', // 'chrono' | 'baggage' | 'category'
  filterPhase: 'all',
  filterBaggage: 'all',
  filterStatus: 'all',
  searchQuery: '',
  collapsedSections: {}
};

// État temporaire du formulaire de voyage (avec distinction Homme / Femme)
let currentParty = {
  adultsMen: 1,
  adultsWomen: 0,
  teensBoys: 0,
  teensGirls: 0,
  childrenBoys: 0,
  childrenGirls: 0,
  babies: 0,
  pets: {
    enabled: false,
    dogs: 0,
    cats: 0,
    others: 0,
    takesPet: true
  }
};
let selectedActivities = new Set();
let selectedCountryKey = 'france';
let selectedTransport = 'avion';
let selectedSeason = 'misaison';
let selectedTripType = 'weekend';
let selectedDays = 3;
let confirmCallback = null;

// Normalisation rétrocompatible de l'objet party
function normalizeParty(party = {}) {
  let adultsMen = Number(party.adultsMen);
  let adultsWomen = Number(party.adultsWomen);
  if (isNaN(adultsMen) && isNaN(adultsWomen)) {
    const oldAdults = Number(party.adults) || 1;
    adultsMen = Math.max(1, Math.ceil(oldAdults / 2));
    adultsWomen = Math.max(0, Math.floor(oldAdults / 2));
  } else {
    adultsMen = Math.max(0, isNaN(adultsMen) ? 1 : adultsMen);
    adultsWomen = Math.max(0, isNaN(adultsWomen) ? 0 : adultsWomen);
    if (adultsMen === 0 && adultsWomen === 0) adultsMen = 1;
  }

  let teensBoys = Number(party.teensBoys);
  let teensGirls = Number(party.teensGirls);
  if (isNaN(teensBoys) && isNaN(teensGirls)) {
    const oldTeens = Number(party.teens) || 0;
    teensBoys = Math.ceil(oldTeens / 2);
    teensGirls = Math.floor(oldTeens / 2);
  } else {
    teensBoys = Math.max(0, isNaN(teensBoys) ? 0 : teensBoys);
    teensGirls = Math.max(0, isNaN(teensGirls) ? 0 : teensGirls);
  }

  let childrenBoys = Number(party.childrenBoys);
  let childrenGirls = Number(party.childrenGirls);
  if (isNaN(childrenBoys) && isNaN(childrenGirls)) {
    const oldChildren = Number(party.children) || 0;
    childrenBoys = Math.ceil(oldChildren / 2);
    childrenGirls = Math.floor(oldChildren / 2);
  } else {
    childrenBoys = Math.max(0, isNaN(childrenBoys) ? 0 : childrenBoys);
    childrenGirls = Math.max(0, isNaN(childrenGirls) ? 0 : childrenGirls);
  }

  const babies = Math.max(0, Number(party.babies) || 0);

  const rawPets = party.pets || {};
  const enabled = Boolean(rawPets.enabled);
  let dogs = 0;
  let cats = 0;
  let others = 0;

  if (rawPets.dogs !== undefined || rawPets.cats !== undefined || rawPets.others !== undefined) {
    dogs = Math.max(0, Number(rawPets.dogs) || 0);
    cats = Math.max(0, Number(rawPets.cats) || 0);
    others = Math.max(0, Number(rawPets.others) || 0);
  } else if (enabled) {
    if (rawPets.type === 'chat') cats = 1;
    else if (rawPets.type === 'autre') others = 1;
    else dogs = 1;
  }

  if (enabled && dogs + cats + others === 0) {
    dogs = 1;
  }

  return {
    adultsMen,
    adultsWomen,
    teensBoys,
    teensGirls,
    childrenBoys,
    childrenGirls,
    babies,
    pets: {
      enabled,
      dogs,
      cats,
      others,
      takesPet: rawPets.takesPet !== false
    }
  };
}

function getTotalPets(pets) {
  if (!pets?.enabled) return 0;
  return (Number(pets.dogs) || 0) + (Number(pets.cats) || 0) + (Number(pets.others) || 0);
}

function formatPetsSummary(pets) {
  if (!pets?.enabled) return '';
  const parts = [];
  if (pets.dogs > 0) parts.push(`${pets.dogs} chien${pets.dogs > 1 ? 's' : ''}`);
  if (pets.cats > 0) parts.push(`${pets.cats} chat${pets.cats > 1 ? 's' : ''}`);
  if (pets.others > 0) parts.push(`${pets.others} autre${pets.others > 1 ? 's animaux' : ' animal'}`);
  return parts.join(', ');
}

// === SVG ICONS ===
const SVG_CHECK = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const SVG_EDIT = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`;
const SVG_TRASH = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;

// === GÉNÉRATEUR INTELLIGENT DE CHECKLIST (CHRONOLOGIQUE & MULTI-PROFILS) ===
function generateChecklist({ countryKey, tripType, season, transport, activities = [], party = currentParty, days }) {
  const country = COUNTRIES[countryKey] || COUNTRIES.france;
  const tType = TRIP_TYPES[tripType] || TRIP_TYPES.weekend;
  const tripDays = Math.max(1, Math.min(365, Number(days) || tType.duration || 3));
  const trans = TRANSPORTS[transport] || TRANSPORTS.avion;
  const baggages = JSON.parse(JSON.stringify(trans.baggages));
  const isPlane = transport === 'avion';

  const p = normalizeParty(party);
  const totalAdults = p.adultsMen + p.adultsWomen;
  const totalTeens = p.teensBoys + p.teensGirls;
  const totalChildren = p.childrenBoys + p.childrenGirls;
  const totalPeople = totalAdults + totalTeens + totalChildren + p.babies;

  const womenCount = p.adultsWomen + p.teensGirls;
  const menCount = p.adultsMen + p.teensBoys;

  // Activités implicites
  const actSet = new Set(activities || []);
  if (tripType === 'ski') actSet.add('ski');
  if (tripType === 'plage') actSet.add('plage');
  if (tripType === 'bivouac') { actSet.add('camping'); actSet.add('randonnee'); }
  if (tripType === 'camping') actSet.add('camping');

  const pickBag = (preferred) => {
    if (preferred === 'porte') return 'porte';
    if (baggages[preferred]) return preferred;
    if (preferred === 'cabine' && baggages.daypack) return 'daypack';
    if (preferred === 'daypack' && baggages.cabine) return 'cabine';
    return Object.keys(baggages)[0];
  };

  let uid = 1;
  const items = [];
  const seenNames = new Set();

  const add = (name, cat, bag, qty = 1, weight = 0, iata = '', phase = 'phase_pack') => {
    const norm = name.toLowerCase().trim();
    if (seenNames.has(norm)) return;
    seenNames.add(norm);
    items.push({
      id: `it_${Date.now()}_${uid++}`,
      name,
      cat,
      baggage: pickBag(bag),
      qty,
      weight,
      iata: isPlane ? iata : '',
      phase,
      checked: false
    });
  };

  const q = Math.min(21, tripDays);
  const needsAdapter = !country.plug.includes("identique France")
    && !country.plug.includes("standard français")
    && !country.plug.includes("compatible France");

  // =========================================================
  // 1. PHASE : EN AMONT (≥ 6 MOIS)
  // =========================================================
  add("Vérification validité des Passeports (> 6 mois après retour) et CNI", "admin", "daypack", Math.max(1, totalPeople), 30, "cabin-only", "phase_6months");

  // Docs officiels du pays
  country.docs.forEach(docName => {
    add(docName, "admin", "daypack", 1, 30, "cabin-only", "phase_6months");
  });

  if (country.region === 'Europe' && country.name !== 'France (Métropole / Corse)') {
    add("Commander la Carte Européenne d'Assurance Maladie (CEAM)", "admin", "daypack", Math.max(1, totalPeople), 10, "cabin-only", "phase_6months");
  }

  add("Souscription / Vérification assurance voyage, assistance & rapatriement", "admin", "daypack", 1, 10, "cabin-only", "phase_6months");
  add("Réservation des billets d'avion / train / traversées", "admin", "daypack", 1, 10, "cabin-only", "phase_6months");
  add("Réservation des hébergements & vérification des conditions", "admin", "daypack", 1, 10, "cabin-only", "phase_6months");

  if (p.babies > 0) {
    add("Livret de famille + Pièce d'identité / Passeport bébé", "baby", "daypack", p.babies, 30, "cabin-only", "phase_6months");
    add("Vérifier disponibilité lit parapluie & chaise haute sur le lieu de séjour", "baby", "daypack", 1, 0, "", "phase_6months");
  }

  if (totalChildren > 0 || totalTeens > 0) {
    add("Vérifier validité CNI / Passeports des mineurs & autorisations requises", "baby", "daypack", totalChildren + totalTeens, 30, "cabin-only", "phase_6months");
  }

  const totalPets = getTotalPets(p.pets);
  const petsDesc = formatPetsSummary(p.pets);

  if (totalPets > 0) {
    if (p.pets.takesPet) {
      add(`Passeport européen (${petsDesc}) + Vaccin rage à jour + Puce électronique`, "pet", "daypack", totalPets, 30, "cabin-only", "phase_6months");
      add(`Réserver le titre de transport pour ${totalPets > 1 ? 'les animaux' : "l'animal"} (${petsDesc}) (train/avion/ferry)`, "pet", "daypack", totalPets, 10, "", "phase_6months");
      add(`Confirmer avec le logement l'accueil des animaux`, "pet", "daypack", 1, 0, "", "phase_6months");
    } else {
      add(`Trouver et réserver une pension ou un pet-sitter de confiance (${petsDesc})`, "pet", "daypack", 1, 0, "", "phase_6months");
    }
  }

  // =========================================================
  // 2. PHASE : PRÉPARATIFS (6 MOIS À J-7)
  // =========================================================
  add("Avertir sa banque du voyage (débloquer plafonds et cartes à l'étranger)", "admin", "daypack", 1, 0, "", "phase_prep");
  add("Vérifier son forfait mobile international ou commander une eSIM", "tech", "daypack", 1, 0, "", "phase_prep");

  if (p.adultsWomen > 0) {
    add("Pilule contraceptive / Contraception (+ ordonnance & plaquettes de réserve)", "health", "daypack", p.adultsWomen, 20, "cabin-only", "phase_prep");
  }

  if (needsAdapter) {
    add(`Commander l'adaptateur de prise de courant (${country.plug})`, "tech", "daypack", Math.max(1, totalAdults), 110, "", "phase_prep");
  }

  add("Télécharger les cartes hors-ligne (Google Maps / Maps.me)", "tech", "daypack", 1, 0, "", "phase_prep");
  add(`Télécharger les applications utiles locales (${country.name})`, "tech", "daypack", 1, 0, "", "phase_prep");
  add("Renouveler les ordonnances et constituer le stock de traitements médicaux", "health", "daypack", 1, 0, "", "phase_prep");
  add("Vérifier dimensions et poids autorisés des bagages (règles transporteur)", "practical", "daypack", 1, 0, "", "phase_prep");

  if (transport === 'voiture') {
    add("Contrôle technique, révision & niveaux de la voiture (huile, pneus, lave-glace)", "practical", "daypack", 1, 0, "", "phase_prep");
  }

  if (totalPets > 0) {
    if (p.pets.takesPet) {
      add(`Visite vétérinaire de contrôle + Traitement antiparasitaire (${petsDesc})`, "pet", "daypack", totalPets, 50, "", "phase_prep");
      add(`Vérifier la caisse de transport homologuée ou harnais sécurité voiture`, "pet", "soute", totalPets, 2500, "", "phase_prep");
    } else {
      add(`Confirmer la garde (${petsDesc}) et préparer le stock de nourriture${p.pets.cats > 0 ? ' & litière' : ''}`, "pet", "daypack", 1, 0, "", "phase_prep");
    }
  }

  // =========================================================
  // 3. PHASE : LA VALISE (J-3 À J-1)
  // =========================================================

  // --- Vêtements Hommes ---
  if (menCount > 0) {
    add("Boxers / Caleçons homme", "clothes", "soute", q * menCount, 60, "", "phase_pack");
    add("Chaussettes homme", "clothes", "soute", q * menCount, 45, "", "phase_pack");
    add("T-shirts / Hauts homme", "clothes", "soute", q * menCount, 160, "", "phase_pack");
  }

  // --- Vêtements Femmes ---
  if (womenCount > 0) {
    add("Culottes / Sous-vêtements femme", "clothes", "soute", q * womenCount, 40, "", "phase_pack");
    add("Soutiens-gorge / Brassières de confort", "clothes", "soute", Math.max(2, Math.min(q, 4) * womenCount), 60, "", "phase_pack");
    add("Collants / Bas (fins ou thermiques selon saison)", "clothes", "soute", Math.max(2, womenCount), 50, "", "phase_pack");
    add("Chaussettes / Socquettes femme", "clothes", "soute", q * womenCount, 35, "", "phase_pack");
    add("T-shirts / Tops / Chemisiers femme", "clothes", "soute", q * womenCount, 130, "", "phase_pack");
  }

  // --- Garde-robe saisonnière commune ---
  const bottomsQty = Math.max(2, Math.ceil(q / 3)) * Math.max(1, totalAdults);
  const sweatersQty = Math.max(2, Math.ceil(q / 5)) * Math.max(1, totalAdults);
  const pyjamaQty = Math.max(1, Math.ceil(q / 7)) * Math.max(1, totalAdults);

  if (season === 'ete') {
    add("Shorts / Pantacourts / Jupes", "clothes", "soute", bottomsQty, 250, "", "phase_pack");
    add("Pantalon léger pour soirées / clim", "clothes", "soute", Math.max(1, totalAdults), 350, "", "phase_pack");
    add("Tongs / Sandales confortables", "clothes", "soute", Math.max(1, totalAdults), 300, "", "phase_pack");
    add("Lunettes de soleil polarisées", "clothes", "daypack", Math.max(1, totalAdults), 45, "", "phase_pack");
    add("Casquette ou chapeau de soleil", "clothes", "daypack", Math.max(1, totalAdults), 80, "", "phase_pack");
  } else if (season === 'hiver') {
    add("Pantalons chauds / Jeans", "clothes", "soute", bottomsQty, 480, "", "phase_pack");
    add("Pulls chauds / Polaires", "clothes", "soute", sweatersQty, 420, "", "phase_pack");
    add("Sous-vêtements thermiques (hauts & bas)", "clothes", "soute", Math.max(2, Math.ceil(q / 5)) * Math.max(1, totalAdults), 220, "", "phase_pack");
    add("Doudoune ou manteau chaud d'hiver", "clothes", "porte", Math.max(1, totalAdults), 850, "", "phase_pack");
    add("Gants chauds", "clothes", "cabine", Math.max(1, totalAdults), 90, "", "phase_pack");
    add("Bonnet & Écharpe ou tour de cou", "clothes", "cabine", Math.max(1, totalAdults), 140, "", "phase_pack");
  } else if (season === 'tropical') {
    add("Vêtements légers et respirants", "clothes", "soute", bottomsQty, 220, "", "phase_pack");
    add("Tongs / Sandales", "clothes", "soute", Math.max(1, totalAdults), 300, "", "phase_pack");
    add("Lunettes de soleil", "clothes", "daypack", Math.max(1, totalAdults), 45, "", "phase_pack");
    add("Chapeau respirant / Casquette", "clothes", "daypack", Math.max(1, totalAdults), 80, "", "phase_pack");
    add("Poncho ou veste de pluie ultra-légère", "clothes", "daypack", Math.max(1, totalAdults), 220, "", "phase_pack");
  } else {
    add("Pantalons confortables de mi-saison", "clothes", "soute", bottomsQty, 420, "", "phase_pack");
    add("Pulls légers ou sweats", "clothes", "cabine", sweatersQty, 350, "", "phase_pack");
    add("Veste coupe-vent imperméable", "clothes", "cabine", Math.max(1, totalAdults), 380, "", "phase_pack");
    add("Parapluie compact de voyage", "clothes", "daypack", 1, 240, "", "phase_pack");
  }

  add("Pyjama / Tenue de nuit", "clothes", "soute", pyjamaQty, 250, "", "phase_pack");
  add("Chaussures de marche confortables", "clothes", "porte", Math.max(1, totalAdults), 750, "", "phase_pack");

  // --- Bébés (< 2 ans) ---
  if (p.babies > 0) {
    const diaperCount = Math.max(8, tripDays * 5 * p.babies);
    add(`Couches bébé (${diaperCount} unités)`, "baby", "soute", diaperCount, 35, "", "phase_pack");
    add("Paquets de lingettes nettoyantes épaisses", "baby", "cabine", Math.max(1, Math.ceil(tripDays / 5)) * p.babies, 260, "", "phase_pack");
    add("Bodys et tenues de rechange bébé", "baby", "soute", Math.max(4, Math.min(24, Math.ceil(tripDays * 1.3))) * p.babies, 110, "", "phase_pack");
    add("Biberons + Tétines + Goupillon", "baby", "cabine", 2 * p.babies, 120, "", "phase_pack");
    add("Lait en poudre ou petits pots / compotes", "baby", "cabine", p.babies, 800, "", "phase_pack");
    add("Bavoirs lavables en silicone ou tissu", "baby", "cabine", 3 * p.babies, 40, "", "phase_pack");
    add("Doudou(s) fétiche + Attache-tétine", "baby", "cabine", p.babies, 80, "", "phase_pack");
    add("Gigoteuse / Turbulette adaptée", "baby", "soute", p.babies, 350, "", "phase_pack");
    add("Poussette compacte cabine ou porte-bébé physiologique", "baby", "cabine", p.babies, 4500, "", "phase_pack");
    add("Trousse soins bébé (thermomètre, sérum phy, paracétamol pédiatrique)", "baby", "cabine", 1, 250, "", "phase_pack");
    add("Trousse toilette bébé (gel lavant doux, crème hydratante)", "baby", "soute", 1, 300, "", "phase_pack");
  }

  // --- Enfants (2-12 ans) ---
  if (p.childrenBoys > 0) {
    add("Tenues garçon (t-shirts, pantalons/shorts)", "baby", "soute", (q + 1) * p.childrenBoys, 200, "", "phase_pack");
    add("Boxers / Slips & chaussettes garçon", "baby", "soute", (q + 1) * p.childrenBoys, 60, "", "phase_pack");
  }
  if (p.childrenGirls > 0) {
    add("Tenues fille (t-shirts, robes/shorts/jupes)", "baby", "soute", (q + 1) * p.childrenGirls, 190, "", "phase_pack");
    add("Culottes & chaussettes / collants fille", "baby", "soute", (q + 1) * p.childrenGirls, 55, "", "phase_pack");
    add("Barrettes & élastiques à cheveux fille", "baby", "daypack", 1, 30, "", "phase_pack");
  }
  if (totalChildren > 0) {
    add("Pyjamas enfant", "baby", "soute", 2 * totalChildren, 180, "", "phase_pack");
    add("Doudou / Peluche préférée de l'enfant", "baby", "daypack", totalChildren, 100, "", "phase_pack");
    add("Brosse à dents enfant + Dentifrice junior", "baby", "cabine", totalChildren, 70, "", "phase_pack");
    add("Cahier de coloriage, feutres & livres de jeux", "practical", "daypack", totalChildren, 250, "", "phase_pack");
    add("Gourde enfant étanche", "practical", "daypack", totalChildren, 150, "", "phase_pack");
    add("Crème solaire enfant très haute protection SPF 50+", "health", "soute", 1, 150, "", "phase_pack");
    if (transport === 'voiture') {
      add("Réhausseur auto / Siège enfant adapté", "practical", "soute", totalChildren, 2000, "", "phase_pack");
    }
  }

  // --- Ados (13-17 ans) ---
  if (p.teensBoys > 0) {
    add("Tenues ado garçon", "clothes", "soute", q * p.teensBoys, 350, "", "phase_pack");
    add("Boxers & chaussettes ado garçon", "clothes", "soute", q * p.teensBoys, 80, "", "phase_pack");
  }
  if (p.teensGirls > 0) {
    add("Tenues ado fille", "clothes", "soute", q * p.teensGirls, 320, "", "phase_pack");
    add("Sous-vêtements, brassières & collants ado fille", "clothes", "soute", q * p.teensGirls, 70, "", "phase_pack");
  }
  if (totalTeens > 0) {
    add("Smartphone + Chargeur personnel + Câble long", "tech", "daypack", totalTeens, 200, "", "phase_pack");
    add("Écouteurs sans fil ou casque audio ado", "tech", "daypack", totalTeens, 180, "cabin-only", "phase_pack");
    add("Batterie externe individuelle (Powerbank)", "tech", "daypack", totalTeens, 220, "cabin-only", "phase_pack");
    add("Trousse de toilette ado (déodorant, soins visage)", "hygiene", "cabine", totalTeens, 200, "", "phase_pack");
    add("Carte d'identité / Passeport ado + Carte étudiant/transport", "admin", "daypack", totalTeens, 30, "", "phase_pack");
  }

  // --- Animaux (si voyage avec nous) ---
  if (totalPets > 0 && p.pets.takesPet) {
    add(`Croquettes / Alimentation (${petsDesc}) pour ${tripDays} jour${tripDays > 1 ? 's' : ''}`, "pet", "soute", totalPets, Math.round(250 * tripDays), "", "phase_pack");
    add("Gamelle de voyage pliable + Gourde pour animal", "pet", "daypack", totalPets, 250, "", "phase_pack");
    if (p.pets.dogs > 0) {
      add("Laisse, collier avec médaille & coordonnées + Harnais de sécurité (chien)", "pet", "daypack", p.pets.dogs, 350, "", "phase_pack");
      add("Sacs à déjections canines (rouleaux)", "pet", "soute", Math.max(1, Math.ceil(tripDays / 7)) * p.pets.dogs, 200, "", "phase_pack");
    }
    if (p.pets.cats > 0) {
      add("Litière compacte de voyage + pelle (chat)", "pet", "soute", p.pets.cats, 300, "", "phase_pack");
      add("Harnais / collier avec médaille d'identification (chat)", "pet", "daypack", p.pets.cats, 120, "", "phase_pack");
    }
    if (p.pets.others > 0) {
      add("Accessoires & équipement spécifique (autre animal)", "pet", "daypack", p.pets.others, 300, "", "phase_pack");
    }
    add("Jouet fétiche / Plaid avec odeur familière", "pet", "daypack", totalPets, 200, "", "phase_pack");
    add("Trousse premiers soins animal (pince à tiques, antiseptique)", "pet", "daypack", 1, 150, "", "phase_pack");
  }

  // --- Tech & Électronique ---
  add("Téléphone + Chargeur rapide + Câbles USB", "tech", "daypack", Math.max(1, totalAdults), 180, "", "phase_pack");
  add("Batterie externe (Powerbank — Cabine obligatoire)", "tech", "daypack", Math.max(1, Math.ceil(totalAdults / 2)), 280, "cabin-only", "phase_pack");
  add("Écouteurs ou casque à réduction de bruit", "tech", "daypack", Math.max(1, totalAdults), 180, "cabin-only", "phase_pack");

  if (transport === 'voiture') {
    add("Chargeur allume-cigare USB + Support smartphone voiture", "tech", "daypack", 1, 150, "", "phase_pack");
  }

  // --- Hygiène & Soins (Adaptés au profil Homme / Femme) ---
  if (womenCount > 0) {
    add("Protections périodiques & hygiéniques (serviettes, tampons, cup, culottes de règles)", "hygiene", "cabine", 1, 150, "", "phase_pack");
    add("Trousse maquillage & Démaquillant / Lingettes réutilisables", "hygiene", "cabine", 1, 200, "", "phase_pack");
    add("Élastiques, pinces à cheveux & brosse démêlante", "hygiene", "daypack", 1, 80, "", "phase_pack");
    add("Rasoir femme / Épilateur / Bandes de cire", "hygiene", isPlane ? "soute" : "cabine", 1, 90, isPlane ? "hold-only" : "", "phase_pack");
    add("Crème hydratante visage / Sérum de soin", "hygiene", "cabine", 1, 100, "", "phase_pack");
  }

  if (menCount > 0) {
    add("Rasoir (manuel ou électrique) + Mousse / Gel à raser", "hygiene", isPlane ? "soute" : "cabine", 1, 160, isPlane ? "hold-only" : "", "phase_pack");
    add("Baume / Lotion après-rasage hydratante", "hygiene", "cabine", 1, 90, "", "phase_pack");
    add("Tondeuse barbe / cheveux + Câble de recharge", "tech", "cabine", 1, 280, "cabin-only", "phase_pack");
  }

  add("Brosse à dents + Dentifrice", "hygiene", "cabine", Math.max(1, totalAdults), 80, "", "phase_pack");
  add(isPlane ? "Pochette transparente liquides < 100ml (1L max)" : "Gel douche & Shampoing", "hygiene", "cabine", 1, 280, "", "phase_pack");
  add("Déodorant", "hygiene", "cabine", Math.max(1, totalAdults), 75, "", "phase_pack");
  add("Brosse / Peigne + Mouchoirs", "hygiene", "daypack", 1, 80, "", "phase_pack");
  add("Coupe-ongles / Pince à épiler", "hygiene", isPlane ? "soute" : "cabine", 1, 50, isPlane ? "hold-only" : "", "phase_pack");

  // --- Santé & Pharmacie ---
  add("Traitements personnels réguliers (+ ordonnances)", "health", "daypack", 1, 100, "cabin-only", "phase_pack");
  add("Paracétamol / Ibuprofène + Pansements adhésifs", "health", "daypack", 1, 60, "", "phase_pack");
  if (season === 'ete' || season === 'tropical' || actSet.has('plage') || actSet.has('ski')) {
    add("Crème solaire SPF 50+ & Baume à lèvres protecteur", "health", "soute", 1, 150, "", "phase_pack");
  }
  if (transport === 'bateau') {
    add("Comprimés contre le mal de mer", "health", "daypack", 1, 30, "", "phase_pack");
  }

  // --- Activités Enrichies (Adaptées Homme / Femme) ---
  if (actSet.has('lecture')) {
    add("Livre de poche ou Liseuse (Kindle/Kobo)", "practical", "daypack", 1, 220, "cabin-only", "phase_pack");
    add("Coussin tour de cou ergonomique / repos", "practical", "daypack", 1, 110, "", "phase_pack");
    add("Lampe de lecture nomade ou marque-page", "practical", "daypack", 1, 45, "", "phase_pack");
  }

  if (actSet.has('soiree')) {
    if (womenCount > 0) {
      add("Robe élégante ou combinaison chic + Bijoux / Pochette", "clothes", "soute", womenCount, 320, "", "phase_pack");
      add("Chaussures habillées / Escarpins ou sandales chic", "clothes", "soute", womenCount, 450, "", "phase_pack");
    }
    if (menCount > 0) {
      add("Chemise habillée + Pantalon chic / Chino + Ceinture", "clothes", "soute", menCount, 380, "", "phase_pack");
      add("Chaussures de ville habillées homme", "clothes", "soute", menCount, 600, "", "phase_pack");
    }
    add("Parfum / Eau de toilette (flacon voyage < 100ml)", "hygiene", "cabine", 1, 120, "", "phase_pack");
  }

  if (actSet.has('plage')) {
    if (womenCount > 0) {
      add("Maillot de bain femme (1 ou 2 pièces) + Paréo / Robe de plage", "clothes", "cabine", 2 * womenCount, 160, "", "phase_pack");
    }
    if (menCount > 0) {
      add("Short de bain / Maillot homme", "clothes", "cabine", 2 * menCount, 140, "", "phase_pack");
    }
    if (totalChildren > 0) {
      add("Maillots de bain enfant", "clothes", "cabine", 2 * totalChildren, 110, "", "phase_pack");
    }
    add("Serviette de plage en microfibre compacte", "practical", "soute", Math.max(1, totalPeople - p.babies), 220, "", "phase_pack");
    add("Sac de plage léger / Panier pliable", "practical", "soute", 1, 200, "", "phase_pack");
  }

  if (actSet.has('piscine')) {
    if (womenCount > 0) {
      add("Maillot de bain de rechange femme", "clothes", "cabine", womenCount, 140, "", "phase_pack");
    }
    if (menCount > 0) {
      add("Maillot de bain de rechange homme", "clothes", "cabine", menCount, 130, "", "phase_pack");
    }
    add("Claquettes ou sandales imperméables spa/bassin", "practical", "soute", Math.max(1, totalAdults), 250, "", "phase_pack");
    add("Bonnet de bain (si requis en bassin)", "practical", "cabine", 1, 40, "", "phase_pack");
  }

  if (actSet.has('randonnee')) {
    add("Chaussures de randonnée crantées", "clothes", "porte", Math.max(1, totalAdults), 950, "", "phase_pack");
    add("Sac à dos de randonnée (20-30L)", "practical", "daypack", 1, 650, "", "phase_pack");
    add("Gourde isotherme 1L à 1.5L", "practical", "daypack", Math.max(1, totalAdults), 180, "", "phase_pack");
    add("Bâtons de marche télescopiques", "practical", isPlane ? "soute" : "daypack", 1, 480, isPlane ? "hold-only" : "", "phase_pack");
    add("Pansements seconde peau anti-ampoules", "health", "daypack", 1, 30, "", "phase_pack");
  }

  if (actSet.has('ski')) {
    add("Skis / Snowboard & Bâtons", "practical", "soute", 1, 4500, "", "phase_pack");
    add("Chaussures de ski", "practical", "soute", 1, 3200, "", "phase_pack");
    add("Casque & Masque de ski anti-buée", "practical", "cabine", Math.max(1, totalAdults), 650, "", "phase_pack");
    add("Blouson & Pantalon de ski imperméables", "clothes", "soute", Math.max(1, totalAdults), 1400, "", "phase_pack");
    add("Gants de ski chauds & imperméables", "clothes", "cabine", Math.max(1, totalAdults), 180, "", "phase_pack");
    add("Chaussettes de ski thermiques", "clothes", "soute", 3 * Math.max(1, totalAdults), 90, "", "phase_pack");
    add("Après-ski / Bottes d'hiver chaudes", "clothes", "soute", Math.max(1, totalAdults), 900, "", "phase_pack");
    add("Chaufferettes jetables mains & pieds", "practical", "cabine", 2, 60, "", "phase_pack");
  }

  if (actSet.has('camping')) {
    add("Tente ou Tarp léger + Sardines", "practical", "soute", 1, 1800, "", "phase_pack");
    add("Sac de couchage adapté à la température", "practical", "soute", Math.max(1, totalAdults + totalChildren), 950, "", "phase_pack");
    add("Matelas de sol isolant", "practical", "soute", Math.max(1, totalAdults), 450, "", "phase_pack");
    add("Lampe frontale + Piles / Câble de recharge", "practical", "daypack", 1, 110, "", "phase_pack");
    add("Réchaud + Popote compacte + Couverts", "practical", "soute", 1, 380, "hold-only", "phase_pack");
    add("Couteau de poche multifonction", "practical", "soute", 1, 120, "hold-only", "phase_pack");
  }

  if (actSet.has('sport')) {
    add("Tenue de sport respirante (short + t-shirt technique)", "clothes", "soute", 2, 220, "", "phase_pack");
    add("Chaussures de running / baskets d'entraînement", "clothes", "soute", 1, 650, "", "phase_pack");
    add("Chaussettes techniques sport", "clothes", "soute", 2, 50, "", "phase_pack");
    add("Brassard ou ceinture porte-téléphone", "practical", "daypack", 1, 60, "", "phase_pack");
  }

  if (actSet.has('velo')) {
    add("Cuissard vélo rembourré + Maillot cyclisme", "clothes", "soute", 2, 260, "", "phase_pack");
    add("Casque de vélo homologué", "practical", "cabine", 1, 320, "", "phase_pack");
    add("Gants courts / Mitaines de vélo", "clothes", "daypack", 1, 50, "", "phase_pack");
    add("Mini-pompe + Chambre à air + Démonte-pneus", "practical", "soute", 1, 250, "", "phase_pack");
  }

  if (actSet.has('culture')) {
    add("Guide touristique papier de la région", "practical", "daypack", 1, 380, "", "phase_pack");
    add("Carnet de voyage personnel + Stylos", "practical", "daypack", 1, 140, "", "phase_pack");
    add("Billets coupe-file imprimés ou enregistrés dans Wallet", "admin", "daypack", 1, 10, "", "phase_pack");
  }

  if (actSet.has('nautique')) {
    add("Masque et tuba ergonomique", "practical", "soute", 1, 350, "", "phase_pack");
    add("Chaussures d'eau / Aquashoes (protection rochers)", "clothes", "soute", Math.max(1, totalAdults), 300, "", "phase_pack");
    add("Pochette étanche certifiée IPX8 pour téléphone", "practical", "daypack", 1, 70, "", "phase_pack");
  }

  if (actSet.has('jeux')) {
    add("Jeux de cartes nomades (Uno, Skyjo, 54 cartes)", "practical", "daypack", 1, 120, "", "phase_pack");
    add("Mini-jeu de société format voyage", "practical", "daypack", 1, 220, "", "phase_pack");
  }

  if (actSet.has('pro')) {
    add("Ordinateur portable + Chargeur USB-C", "tech", "daypack", 1, 1500, "cabin-only", "phase_pack");
    add("Souris sans fil + Adaptateur HDMI", "tech", "daypack", 1, 140, "", "phase_pack");
    add("Badge pro / Carnet de notes & stylo", "admin", "daypack", 1, 120, "", "phase_pack");
  }

  if (actSet.has('photo')) {
    add("Appareil photo reflex / hybride + Objectifs", "tech", "daypack", 1, 950, "cabin-only", "phase_pack");
    add("Batteries de rechange + Chargeur dédié", "tech", "daypack", 2, 130, "cabin-only", "phase_pack");
    add("Cartes mémoires SD haute vitesse", "tech", "daypack", 2, 15, "", "phase_pack");
  }

  // Accessoires pays
  country.accessories.forEach(acc => {
    if (needsAdapter && acc.toLowerCase().includes("adaptateur")) return;
    add(acc, "practical", "soute", 1, 120, "", "phase_pack");
  });

  if (transport === 'voiture') {
    add("Gilet jaune de sécurité + Triangle de signalisation", "practical", "daypack", 1, 450, "", "phase_pack");
    if (season === 'hiver' || actSet.has('ski')) {
      add("Chaînes ou chaussettes neige pour pneus", "practical", "soute", 1, 2500, "", "phase_pack");
    }
  }

  // Clôture valise
  add("Peser chaque bagage au pèse-valise (respect franchise)", "practical", "daypack", 1, 0, "", "phase_pack");
  add("Télécharger films, séries et podcasts hors-ligne pour le trajet", "tech", "daypack", 1, 0, "", "phase_pack");
  add("Sac pliable en toile (Totebag) pour courses et souvenirs", "souvenirs", "daypack", 1, 60, "", "phase_pack");

  // =========================================================
  // 4. PHASE : JOUR J & MAISON (AVANT DÉPART)
  // =========================================================
  add("Fermer toutes les fenêtres, baies vitrées et volets", "house", "porte", 1, 0, "", "phase_departure");
  add("Vider le frigo des aliments périssables et sortir les poubelles", "house", "porte", 1, 0, "", "phase_departure");
  add("Couper l'arrivée d'eau générale", "house", "porte", 1, 0, "", "phase_departure");
  add("Couper le gaz / passer le chauffe-eau en mode absence", "house", "porte", 1, 0, "", "phase_departure");
  add("Débrancher les appareils électriques non indispensables", "house", "porte", 1, 0, "", "phase_departure");
  add("Baisser le chauffage ou éteindre la climatisation", "house", "porte", 1, 0, "", "phase_departure");
  add("Arroser les plantes d'intérieur et d'extérieur", "house", "porte", 1, 0, "", "phase_departure");
  add("Passeports, billets de transport et cartes de paiement sur soi", "admin", "porte", 1, 0, "cabin-only", "phase_departure");
  add(`Moyens de paiement (cartes bancaires + espèces ${country.currency})`, "admin", "porte", 1, 50, "cabin-only", "phase_departure");
  add("Smartphones chargés à 100% + Powerbanks dans le sac cabine", "tech", "daypack", 1, 0, "cabin-only", "phase_departure");

  if (p.babies > 0) {
    add("Sac à langer du trajet prêt (biberon, dosettes, couches, change, doudou)", "baby", "daypack", 1, 0, "", "phase_departure");
  }

  if (totalPets > 0) {
    if (p.pets.takesPet) {
      add(`Sortir ${totalPets > 1 ? 'les animaux' : "l'animal"} pour ses besoins et donner à boire avant départ`, "pet", "porte", 1, 0, "", "phase_departure");
    } else {
      add(`Déposer ${totalPets > 1 ? 'les animaux' : "l'animal"} chez le gardien ou laisser les clés au pet-sitter`, "pet", "porte", 1, 0, "", "phase_departure");
    }
  }

  add("Verrouiller la porte d'entrée à double tour", "house", "porte", 1, 0, "", "phase_departure");

  // =========================================================
  // 5. PHASE : AU RETOUR (CHECK CHAMBRE & VALISE RETOUR)
  // =========================================================
  add("Tour méticuleux de la chambre : inspecter sous les lits et derrière les portes", "souvenirs", "porte", 1, 0, "", "phase_return");
  add("Vérifier toutes les prises murales (ne laisser aucun chargeur ni adaptateur)", "tech", "porte", 1, 0, "", "phase_return");
  add("Vérifier la salle de bain (brosses à dents, trousses, produits douche)", "hygiene", "porte", 1, 0, "", "phase_return");
  add("Vérifier le coffre-fort de la chambre (passeports, bijoux, devises restantes)", "admin", "daypack", 1, 0, "cabin-only", "phase_return");
  add("Ranger soigneusement les souvenirs fragiles au milieu des vêtements en soute", "souvenirs", "soute", 1, 0, "", "phase_return");
  add("Isoler le linge sale dans des sacs séparés pour faciliter le déballage", "clothes", "soute", 1, 0, "", "phase_return");
  add("Conserver les factures & formulaires de détaxe aéroportuaire", "admin", "daypack", 1, 0, "", "phase_return");
  add("Télécharger les cartes d'embarquement / billets retour sur le smartphone", "admin", "daypack", 1, 0, "", "phase_return");

  return { baggages, items, activities: Array.from(actSet), party: p };
}

function createTripObject({ name, countryKey, tripType, season, transport, activities = [], party = currentParty, days, blank = false }) {
  const tType = TRIP_TYPES[tripType] || TRIP_TYPES.weekend;
  const tripDays = Math.max(1, Math.min(365, Number(days) || tType.duration || 3));
  const generated = blank
    ? { baggages: JSON.parse(JSON.stringify((TRANSPORTS[transport] || TRANSPORTS.avion).baggages)), items: [], activities: [], party }
    : generateChecklist({ countryKey, tripType, season, transport, activities, party, days: tripDays });

  return {
    id: 'trip_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name,
    countryKey,
    tripType,
    days: tripDays,
    season,
    transport,
    party: generated.party || party,
    activities: generated.activities,
    baggages: generated.baggages,
    items: generated.items
  };
}

// === STATE & LOCALSTORAGE ===
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY_V3) || localStorage.getItem(LEGACY_STORAGE_KEY_V2);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.trips)) {
        appState = { ...appState, ...parsed };
        if (!appState.collapsedSections || typeof appState.collapsedSections !== 'object') {
          appState.collapsedSections = {};
        }

        // Migration rétrocompatible : s'assurer que chaque voyage a party et que chaque item a phase
        appState.trips.forEach(t => {
          t.party = normalizeParty(t.party);
          if (Array.isArray(t.items)) {
            t.items.forEach(item => {
              if (!item.phase) {
                if (item.cat === 'house') item.phase = 'phase_departure';
                else if (item.cat === 'souvenirs') item.phase = 'phase_return';
                else if (item.cat === 'admin' && (item.name.toLowerCase().includes('passeport') || item.name.toLowerCase().includes('visa') || item.name.toLowerCase().includes('vaccin') || item.name.toLowerCase().includes('assurance'))) {
                  item.phase = 'phase_6months';
                } else {
                  item.phase = 'phase_pack';
                }
              }
            });
          }
        });

        if (appState.trips.length === 0) {
          appState.activeTripId = null;
        }
        return;
      }
    } catch (e) {
      console.warn("Erreur lecture cache local:", e);
    }
  }
  appState.trips = [];
  appState.activeTripId = null;
}

function saveState(shouldRender = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  if (shouldRender) render();
}

function getActiveTrip() {
  if (!appState.trips.length || !appState.activeTripId) return null;
  return appState.trips.find(t => t.id === appState.activeTripId) || null;
}

// === THÈME LIGHT / DARK ===
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
}

// === TOASTS & CONFIRMATION ===
function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.2s ease';
    setTimeout(() => el.remove(), 220);
  }, 2600);
}

function showConfirm(title, message, okLabel = "Confirmer", onConfirm) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  const okBtn = document.getElementById('confirmOkBtn');
  okBtn.textContent = okLabel;
  confirmCallback = onConfirm;
  document.getElementById('confirmModal').classList.add('open');
}

function closeConfirmModal() {
  document.getElementById('confirmModal').classList.remove('open');
  confirmCallback = null;
}

// === INITIALISATION ===
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadState();
  initFormComponents();
  initListeners();
  render();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});

// === COMPOSANTS DU FORMULAIRE DE VOYAGE ===
function initFormComponents() {
  renderTransportPicker();
  renderSeasonPicker();
  renderTripTypePicker();
  renderActivityChips();
  initCountryPicker();
  updatePartyDisplay();
  updatePrefillPreview();
}

function renderTransportPicker() {
  const container = document.getElementById('transportPickerGrid');
  if (!container) return;
  container.innerHTML = Object.entries(TRANSPORTS).map(([key, t]) => {
    const isSelected = selectedTransport === key;
    return `
      <button type="button" class="visual-card-btn ${isSelected ? 'selected' : ''}" data-transport="${key}" onclick="setTransportSelection('${key}')">
        <div class="visual-card-icon">${t.iconSvg}</div>
        <div class="visual-card-text">
          <span class="visual-card-title">${escapeHtml(t.label)}</span>
          <span class="visual-card-sub">${escapeHtml(t.sub)}</span>
        </div>
      </button>
    `;
  }).join('');
}

function setTransportSelection(key) {
  selectedTransport = key;
  document.getElementById('tripTransportSelect').value = key;
  renderTransportPicker();
  updatePrefillPreview();
}

function renderSeasonPicker() {
  const container = document.getElementById('seasonPickerGrid');
  if (!container) return;
  container.innerHTML = Object.entries(SEASONS).map(([key, s]) => {
    const isSelected = selectedSeason === key;
    return `
      <button type="button" class="visual-card-btn ${isSelected ? 'selected' : ''}" data-season="${key}" onclick="setSeasonSelection('${key}')">
        <div class="visual-card-icon">${s.iconSvg}</div>
        <div class="visual-card-text">
          <span class="visual-card-title">${escapeHtml(s.label)}</span>
          <span class="visual-card-sub">${escapeHtml(s.desc)}</span>
        </div>
      </button>
    `;
  }).join('');
}

function setSeasonSelection(key) {
  selectedSeason = key;
  document.getElementById('tripSeasonSelect').value = key;
  renderSeasonPicker();
  updatePrefillPreview();
}

function renderTripTypePicker() {
  const container = document.getElementById('tripTypePickerGrid');
  if (!container) return;
  container.innerHTML = Object.entries(TRIP_TYPES).map(([key, t]) => {
    const isSelected = selectedTripType === key;
    return `
      <button type="button" class="visual-card-btn ${isSelected ? 'selected' : ''}" data-trip-type="${key}" onclick="setTripTypeSelection('${key}')">
        <div class="visual-card-icon">${t.iconSvg}</div>
        <div class="visual-card-text">
          <span class="visual-card-title">${escapeHtml(t.label)}</span>
          <span class="visual-card-sub">${escapeHtml(t.desc)}</span>
        </div>
      </button>
    `;
  }).join('');
}

function setTripTypeSelection(key, syncDays = true) {
  selectedTripType = key;
  document.getElementById('tripTypeSelect').value = key;
  if (syncDays) {
    selectedDays = TRIP_TYPES[key]?.duration || 3;
  }
  syncTripDaysInput();
  if (key === 'ski') selectedActivities.add('ski');
  if (key === 'plage') selectedActivities.add('plage');
  if (key === 'bivouac') { selectedActivities.add('camping'); selectedActivities.add('randonnee'); }
  if (key === 'camping') selectedActivities.add('camping');
  renderTripTypePicker();
  renderActivityChips();
  updatePrefillPreview();
}

function syncTripDaysInput() {
  const input = document.getElementById('tripDaysInput');
  if (input) input.value = selectedDays;
}

function adjustTripDays(delta) {
  selectedDays = Math.max(1, Math.min(365, (Number(selectedDays) || 1) + delta));
  syncTripDaysInput();
  updatePrefillPreview();
}

function onTripDaysInput(val) {
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) return;
  selectedDays = Math.max(1, Math.min(365, parsed));
  updatePrefillPreview();
}

function renderActivityChips() {
  const container = document.getElementById('activityChipsContainer');
  if (!container) return;
  container.innerHTML = Object.values(ACTIVITIES).map(act => {
    const active = selectedActivities.has(act.id);
    return `
      <button type="button" class="activity-chip ${active ? 'selected' : ''}" data-activity="${act.id}">
        <span class="chip-svg">${act.iconSvg}</span>
        <span class="chip-label">${escapeHtml(act.label)}</span>
        ${active ? `<span class="chip-check">${SVG_CHECK}</span>` : ''}
      </button>
    `;
  }).join('');

  container.querySelectorAll('.activity-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.activity;
      if (selectedActivities.has(id)) selectedActivities.delete(id);
      else selectedActivities.add(id);
      renderActivityChips();
      updatePrefillPreview();
    });
  });
}

// === PERSONNES & ANIMAUX (STEPPERS & ACCORDÉON AVEC HOMMES / FEMMES) ===
function adjustParty(role, delta) {
  if (role === 'adultsMen') {
    const next = Math.max(0, (currentParty.adultsMen || 0) + delta);
    if (next === 0 && (currentParty.adultsWomen || 0) === 0) return; // Au moins 1 adulte
    currentParty.adultsMen = next;
  } else if (role === 'adultsWomen') {
    const next = Math.max(0, (currentParty.adultsWomen || 0) + delta);
    if (next === 0 && (currentParty.adultsMen || 0) === 0) return; // Au moins 1 adulte
    currentParty.adultsWomen = next;
  } else if (role === 'teensBoys') {
    currentParty.teensBoys = Math.max(0, (currentParty.teensBoys || 0) + delta);
  } else if (role === 'teensGirls') {
    currentParty.teensGirls = Math.max(0, (currentParty.teensGirls || 0) + delta);
  } else if (role === 'childrenBoys') {
    currentParty.childrenBoys = Math.max(0, (currentParty.childrenBoys || 0) + delta);
  } else if (role === 'childrenGirls') {
    currentParty.childrenGirls = Math.max(0, (currentParty.childrenGirls || 0) + delta);
  } else if (role === 'babies') {
    currentParty.babies = Math.max(0, (currentParty.babies || 0) + delta);
  }
  updatePartyDisplay();
  updatePrefillPreview();
}

function updatePartyDisplay() {
  const p = normalizeParty(currentParty);
  currentParty = p;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setVal('partyAdultsMenCount', p.adultsMen);
  setVal('partyAdultsWomenCount', p.adultsWomen);
  setVal('partyTeensBoysCount', p.teensBoys);
  setVal('partyTeensGirlsCount', p.teensGirls);
  setVal('partyChildrenBoysCount', p.childrenBoys);
  setVal('partyChildrenGirlsCount', p.childrenGirls);
  setVal('partyBabiesCount', p.babies);

  const petToggle = document.getElementById('partyPetToggle');
  const petBody = document.getElementById('petAccordionBody');
  if (petToggle && petBody) {
    petToggle.checked = Boolean(p.pets?.enabled);
    petBody.style.display = p.pets?.enabled ? 'block' : 'none';
  }

  setVal('partyPetDogsCount', p.pets?.dogs ?? 0);
  setVal('partyPetCatsCount', p.pets?.cats ?? 0);
  setVal('partyPetOthersCount', p.pets?.others ?? 0);

  document.querySelectorAll('#petTravelPills .pill-btn').forEach(btn => {
    const travelVal = p.pets?.takesPet !== false ? 'travel' : 'stay';
    btn.classList.toggle('active', btn.dataset.petTravel === travelVal);
  });
}

function adjustPet(kind, delta) {
  if (!currentParty.pets) currentParty.pets = { enabled: true, dogs: 0, cats: 0, others: 0, takesPet: true };
  const current = Number(currentParty.pets[kind]) || 0;
  currentParty.pets[kind] = Math.max(0, Math.min(10, current + delta));
  syncPartySteppersUI();
  updatePrefillPreview();
}

function onPetToggleChange(checked) {
  if (!currentParty.pets) currentParty.pets = { enabled: false, dogs: 0, cats: 0, others: 0, takesPet: true };
  currentParty.pets.enabled = checked;
  if (checked && getTotalPets(currentParty.pets) === 0) {
    currentParty.pets.dogs = 1;
  }
  const petBody = document.getElementById('petAccordionBody');
  if (petBody) petBody.style.display = checked ? 'block' : 'none';
  syncPartySteppersUI();
  updatePrefillPreview();
}

// === SÉLECTEUR DE DESTINATION MODERNE (CUSTOM DRAWER / MODAL) ===
let currentRegionFilter = 'all';

function initCountryPicker() {
  document.getElementById('btnCountryTrigger')?.addEventListener('click', openCountryPickerModal);

  const searchInput = document.getElementById('countrySearchInput');
  searchInput?.addEventListener('input', (e) => {
    renderCountryPickerList(currentRegionFilter, e.target.value.toLowerCase().trim());
  });

  document.querySelectorAll('#petTravelPills .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#petTravelPills .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (!currentParty.pets) currentParty.pets = { enabled: true, dogs: 1, cats: 0, others: 0, takesPet: true };
      currentParty.pets.takesPet = btn.dataset.petTravel === 'travel';
      updatePrefillPreview();
    });
  });
}

function openCountryPickerModal() {
  const modal = document.getElementById('countryPickerModal');
  if (!modal) return;
  currentRegionFilter = 'all';
  renderRegionTabs();
  renderCountryPickerList('all', '');
  modal.classList.add('open');
  const searchInput = document.getElementById('countrySearchInput');
  if (searchInput) {
    searchInput.value = '';
    setTimeout(() => searchInput.focus(), 120);
  }
}

function closeCountryPickerModal() {
  document.getElementById('countryPickerModal')?.classList.remove('open');
}

function renderRegionTabs() {
  const container = document.getElementById('regionTabsContainer');
  if (!container) return;
  const regions = ['all', 'Europe', 'Asie', 'Amérique du Nord', 'Amérique du Sud', 'Afrique'];
  const labels = {
    all: 'Toutes',
    Europe: 'Europe',
    Asie: 'Asie',
    'Amérique du Nord': 'Amér. Nord',
    'Amérique du Sud': 'Amér. Sud',
    Afrique: 'Afrique'
  };

  container.innerHTML = regions.map(reg => `
    <button type="button" class="region-tab ${currentRegionFilter === reg ? 'active' : ''}" data-region="${reg}">
      ${labels[reg]}
    </button>
  `).join('');

  container.querySelectorAll('.region-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentRegionFilter = tab.dataset.region;
      renderRegionTabs();
      const q = document.getElementById('countrySearchInput')?.value.toLowerCase().trim() || '';
      renderCountryPickerList(currentRegionFilter, q);
    });
  });
}

function renderCountryPickerList(regionFilter = 'all', query = '') {
  const listEl = document.getElementById('countryPickerList');
  if (!listEl) return;

  const entries = Object.entries(COUNTRIES).filter(([key, c]) => {
    if (regionFilter !== 'all' && c.region !== regionFilter) return false;
    if (query) {
      const matchName = c.name.toLowerCase().includes(query);
      const matchRegion = c.region.toLowerCase().includes(query);
      const matchCurr = c.currency.toLowerCase().includes(query);
      const matchPlug = c.plug.toLowerCase().includes(query);
      if (!matchName && !matchRegion && !matchCurr && !matchPlug) return false;
    }
    return true;
  });

  if (entries.length === 0) {
    listEl.innerHTML = `<div class="empty-filter-box"><p>Aucun pays trouvé</p></div>`;
    return;
  }

  listEl.innerHTML = entries.map(([key, c]) => {
    const isSelected = selectedCountryKey === key;
    return `
      <button type="button" class="country-picker-item ${isSelected ? 'selected' : ''}" onclick="selectCountry('${key}')">
        <span class="country-item-flag">${c.flag}</span>
        <div class="country-item-info">
          <span class="country-item-name">${escapeHtml(c.name)}</span>
          <span class="country-item-meta">${escapeHtml(c.region)} · ${escapeHtml(c.currency)} · ${escapeHtml(c.plug)}</span>
        </div>
        ${isSelected ? `<span class="country-item-check">${SVG_CHECK}</span>` : ''}
      </button>
    `;
  }).join('');
}

function selectCountry(key) {
  selectedCountryKey = key;
  const c = COUNTRIES[key] || COUNTRIES.france;
  document.getElementById('tripCountrySelect').value = key;
  document.getElementById('selectedCountryFlag').textContent = c.flag;
  document.getElementById('selectedCountryName').textContent = c.name;
  document.getElementById('selectedCountryMeta').textContent = `${c.region} · Prise ${c.plug} · ${c.currency}`;
  closeCountryPickerModal();
  updatePrefillPreview();
}

function updatePrefillPreview() {
  const previewEl = document.getElementById('prefillPreview');
  if (!previewEl) return;

  const { items, party } = generateChecklist({
    countryKey: selectedCountryKey,
    tripType: selectedTripType,
    season: selectedSeason,
    transport: selectedTransport,
    activities: Array.from(selectedActivities),
    party: currentParty,
    days: selectedDays
  });

  const p = normalizeParty(party);
  const peopleCount = p.adultsMen + p.adultsWomen + p.teensBoys + p.teensGirls + p.childrenBoys + p.childrenGirls + p.babies;

  const partyTokens = [];
  const adultTokens = [];
  if (p.adultsMen > 0) adultTokens.push(`${p.adultsMen}H`);
  if (p.adultsWomen > 0) adultTokens.push(`${p.adultsWomen}F`);
  if (adultTokens.length > 0) partyTokens.push(adultTokens.join('/'));

  const teenTokens = [];
  if (p.teensBoys > 0) teenTokens.push(`${p.teensBoys} ado G.`);
  if (p.teensGirls > 0) teenTokens.push(`${p.teensGirls} ado F.`);
  if (teenTokens.length > 0) partyTokens.push(teenTokens.join(', '));

  const childTokens = [];
  if (p.childrenBoys > 0) childTokens.push(`${p.childrenBoys} garç.`);
  if (p.childrenGirls > 0) childTokens.push(`${p.childrenGirls} fille${p.childrenGirls > 1 ? 's' : ''}`);
  if (childTokens.length > 0) partyTokens.push(childTokens.join(', '));

  if (p.babies > 0) partyTokens.push(`${p.babies} bébé${p.babies > 1 ? 's' : ''}`);
  const petsSummary = formatPetsSummary(p.pets);
  if (petsSummary) {
    partyTokens.push(`${petsSummary} (${p.pets.takesPet ? 'emmené' : 'gardé'}${getTotalPets(p.pets) > 1 ? 's' : ''})`);
  }

  const summary = partyTokens.length > 0 ? partyTokens.join(' · ') : `${peopleCount} voyageur${peopleCount > 1 ? 's' : ''}`;

  const phaseCounts = {
    phase_6months: items.filter(i => i.phase === 'phase_6months').length,
    phase_prep: items.filter(i => i.phase === 'phase_prep').length,
    phase_pack: items.filter(i => i.phase === 'phase_pack').length,
    phase_departure: items.filter(i => i.phase === 'phase_departure').length,
    phase_return: items.filter(i => i.phase === 'phase_return').length
  };

  previewEl.innerHTML = `
    <div class="prefill-preview-inner">
      <div class="prefill-badge-row">
        <span class="badge-tag"><strong>${items.length} articles</strong> générés</span>
        <span class="badge-tag-subtle">${selectedDays} jour${selectedDays > 1 ? 's' : ''} · ${summary}</span>
      </div>
      <div class="chrono-mini-timeline">
        <span title="En amont">6m+ : ${phaseCounts.phase_6months}</span> · 
        <span title="Préparatifs">Prépa : ${phaseCounts.phase_prep}</span> · 
        <span title="Valise">Valise : ${phaseCounts.phase_pack}</span> · 
        <span title="Jour J">Jour J : ${phaseCounts.phase_departure}</span> · 
        <span title="Retour">Retour : ${phaseCounts.phase_return}</span>
      </div>
    </div>
  `;
}

// === ÉCOUTEURS D'ÉVÉNEMENTS ===
function initListeners() {
  // Header
  document.getElementById('btnThemeToggle')?.addEventListener('click', toggleTheme);
  document.getElementById('btnNewTripHeader')?.addEventListener('click', () => openTripModal(null));
  document.getElementById('btnTripSwitcher')?.addEventListener('click', openTripsModal);
  document.getElementById('brandHomeBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (appState.trips.length > 0) openTripsModal();
  });

  // More Menu Dropdown
  const moreBtn = document.getElementById('btnMoreMenu');
  const moreMenu = document.getElementById('moreDropdown');
  moreBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = moreMenu.classList.toggle('open');
    moreBtn.setAttribute('aria-expanded', isOpen);
  });
  document.addEventListener('click', () => {
    moreMenu?.classList.remove('open');
    moreBtn?.setAttribute('aria-expanded', 'false');
  });

  // Empty State
  document.getElementById('btnEmptyNewTrip')?.addEventListener('click', () => openTripModal(null));
  document.getElementById('btnEmptyTemplates')?.addEventListener('click', openTemplatesModal);
  document.querySelectorAll('.preset-chip').forEach(btn => {
    btn.addEventListener('click', () => createQuickPreset(btn.dataset.preset));
  });

  // Active Trip Hero Buttons
  document.getElementById('btnEditTrip')?.addEventListener('click', () => {
    const trip = getActiveTrip();
    if (trip) openTripModal(trip);
  });
  document.getElementById('btnDeleteTrip')?.addEventListener('click', () => {
    const trip = getActiveTrip();
    if (trip) deleteTripById(trip.id);
  });

  // View Mode Tabs (Chronologie / Bagages / Catégories)
  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      appState.viewMode = target.dataset.view;
      render();
    });
  });

  // Repli / dépliage des catégories et sections
  const sectionsContainer = document.getElementById('categorySectionsContainer');
  sectionsContainer?.addEventListener('click', (e) => {
    const header = e.target.closest('[data-collapse-key]');
    if (!header) return;
    toggleSectionCollapse(header.dataset.collapseKey, header);
  });
  sectionsContainer?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const header = e.target.closest('[data-collapse-key]');
    if (!header) return;
    e.preventDefault();
    toggleSectionCollapse(header.dataset.collapseKey, header);
  });

  // Search Input
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('btnClearSearch');
  searchInput?.addEventListener('input', (e) => {
    appState.searchQuery = e.target.value.toLowerCase().trim();
    if (clearBtn) clearBtn.style.display = appState.searchQuery ? 'flex' : 'none';
    renderList();
  });
  clearBtn?.addEventListener('click', () => {
    searchInput.value = '';
    appState.searchQuery = '';
    clearBtn.style.display = 'none';
    renderList();
  });

  // Segmented Status Filter (Tous / À faire / Prêts)
  document.querySelectorAll('.segment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.segment').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      e.currentTarget.classList.add('active');
      e.currentTarget.setAttribute('aria-selected', 'true');
      appState.filterStatus = e.currentTarget.dataset.filter;
      renderList();
    });
  });

  // Modale Article & Form
  document.getElementById('btnAddItem')?.addEventListener('click', () => openItemModal(null));
  document.getElementById('itemForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveItemForm();
  });

  // Formulaire Voyage
  document.getElementById('tripForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveTripForm();
  });

  // Switcher & Modèles
  document.getElementById('btnNewTripFromSwitcher')?.addEventListener('click', () => {
    closeTripsModal();
    openTripModal(null);
  });
  document.getElementById('btnTemplates')?.addEventListener('click', openTemplatesModal);
  document.getElementById('btnSaveAsTemplate')?.addEventListener('click', saveCurrentTripAsTemplate);
  document.getElementById('btnCreateBlankTrip')?.addEventListener('click', createBlankTrip);

  // Actions More Menu
  document.getElementById('btnResetAll')?.addEventListener('click', () => {
    const trip = getActiveTrip();
    if (!trip) return;
    showConfirm("Nouveau départ", `Décocher tous les articles de « ${trip.name} » ?`, "Tout décocher", () => {
      trip.items.forEach(i => i.checked = false);
      saveState();
      showToast("Checklist réinitialisée");
    });
  });
  document.getElementById('btnExport')?.addEventListener('click', exportData);
  document.getElementById('btnImport')?.addEventListener('click', () => document.getElementById('importFileInput').click());
  document.getElementById('importFileInput')?.addEventListener('change', importData);
  document.getElementById('btnPrint')?.addEventListener('click', () => {
    if (!getActiveTrip()) return;
    window.print();
  });

  // Confirm Modal
  document.getElementById('confirmCancelBtn')?.addEventListener('click', closeConfirmModal);
  document.getElementById('confirmOkBtn')?.addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    closeConfirmModal();
  });

  // Fermeture des modales au clic sur le fond
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
}

// === RENDU PRINCIPAL ===
function render() {
  const trip = getActiveTrip();
  const emptyEl = document.getElementById('emptyStateView');
  const activeEl = document.getElementById('activeTripView');
  const switcherBtn = document.getElementById('btnTripSwitcher');
  const switcherLabel = document.getElementById('tripSwitcherLabel');

  if (!trip) {
    if (emptyEl) emptyEl.style.display = 'block';
    if (activeEl) activeEl.style.display = 'none';
    if (switcherBtn) {
      if (appState.trips.length > 0) {
        switcherBtn.style.display = 'inline-flex';
        switcherLabel.textContent = `${appState.trips.length} voyage${appState.trips.length > 1 ? 's' : ''}`;
      } else {
        switcherBtn.style.display = 'none';
      }
    }
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  if (activeEl) activeEl.style.display = 'block';
  if (switcherBtn) {
    switcherBtn.style.display = 'inline-flex';
    switcherLabel.textContent = trip.name;
  }

  // Active view tab state
  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === appState.viewMode);
  });

  renderTripHeader(trip);
  renderBaggageStrip(trip);
  renderChronoFilterStrip(trip);
  renderList(trip);
}

function renderTripHeader(trip) {
  const country = COUNTRIES[trip.countryKey] || COUNTRIES.france;
  const tType = TRIP_TYPES[trip.tripType] || TRIP_TYPES.weekend;
  const season = SEASONS[trip.season] || SEASONS.misaison;
  const trans = TRANSPORTS[trip.transport] || TRANSPORTS.avion;
  const p = normalizeParty(trip.party);

  document.getElementById('heroFlag').textContent = country.flag;
  document.getElementById('heroTitle').textContent = trip.name;

  // Composition du groupe
  const parts = [];
  parts.push(country.name);

  const travelers = [];
  const adultTokens = [];
  if (p.adultsMen > 0) adultTokens.push(`${p.adultsMen}H`);
  if (p.adultsWomen > 0) adultTokens.push(`${p.adultsWomen}F`);
  if (adultTokens.length > 0) travelers.push(adultTokens.join('/'));

  if (p.teensBoys > 0) travelers.push(`${p.teensBoys} ado G.`);
  if (p.teensGirls > 0) travelers.push(`${p.teensGirls} ado F.`);
  if (p.childrenBoys > 0) travelers.push(`${p.childrenBoys} garç.`);
  if (p.childrenGirls > 0) travelers.push(`${p.childrenGirls} fille${p.childrenGirls > 1 ? 's' : ''}`);
  if (p.babies > 0) travelers.push(`${p.babies} bébé${p.babies > 1 ? 's' : ''}`);
  const heroPetsSummary = formatPetsSummary(p.pets);
  if (heroPetsSummary) {
    travelers.push(`${heroPetsSummary} (${p.pets.takesPet ? 'voyage' : 'garde'})`);
  }
  if (travelers.length > 0) parts.push(travelers.join(', '));

  const tripDays = Math.max(1, Number(trip.days) || tType.duration || 3);
  parts.push(`${tripDays} jour${tripDays > 1 ? 's' : ''}`);
  parts.push(trans.label);
  parts.push(season.label.split('/')[0].trim());

  document.getElementById('heroMeta').textContent = parts.join(' · ');

  // Progression globale
  const totalCount = trip.items.length;
  const totalChecked = trip.items.filter(i => i.checked).length;
  const pctGlobal = totalCount > 0 ? Math.round((totalChecked / totalCount) * 100) : 0;

  document.getElementById('globalProgressText').textContent = `${totalChecked} / ${totalCount} préparés (${pctGlobal}%)`;
  document.getElementById('globalWeightText').textContent = `${(getAllWeight(trip) / 1000).toFixed(2)} kg`;

  const fillEl = document.getElementById('globalProgressFill');
  fillEl.style.width = `${pctGlobal}%`;
  fillEl.classList.toggle('complete', totalCount > 0 && totalChecked === totalCount);

  // Infos pratiques pays
  const infoEl = document.getElementById('countryInfoBar');
  if (infoEl) {
    infoEl.style.display = 'flex';
    infoEl.innerHTML = `
      <span class="country-strip-item"><strong>Prise :</strong> ${escapeHtml(country.plug)}</span>
      <span class="country-strip-item"><strong>Devise :</strong> ${escapeHtml(country.currency)}</span>
    `;
  }

  // Alerte pays si vigilance
  const alertEl = document.getElementById('countryAlertBanner');
  if (alertEl) {
    if (country.riskLevel === 'caution' && country.riskAlert) {
      alertEl.style.display = 'flex';
      alertEl.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div><strong>Vigilance (${escapeHtml(country.name)}) :</strong> ${escapeHtml(country.riskAlert)}</div>
      `;
    } else {
      alertEl.style.display = 'none';
    }
  }

  // Règle IATA avion
  const iataEl = document.getElementById('iataCallout');
  if (iataEl) {
    iataEl.style.display = trans.showIata ? 'flex' : 'none';
  }
}

function calculateWeights(trip) {
  const result = {};
  for (const key of Object.keys(trip.baggages)) {
    result[key] = { current: 0, count: 0, checkedCount: 0 };
  }
  result['porte'] = { current: 0, count: 0, checkedCount: 0 };

  trip.items.forEach(item => {
    const bKey = item.baggage || Object.keys(trip.baggages)[0];
    if (!result[bKey]) result[bKey] = { current: 0, count: 0, checkedCount: 0 };
    const w = (Number(item.weight) || 0) * (Number(item.qty) || 1);
    result[bKey].current += w;
    result[bKey].count++;
    if (item.checked) result[bKey].checkedCount++;
  });

  return result;
}

function getAllWeight(trip) {
  return trip.items.reduce((sum, item) => sum + ((Number(item.weight) || 0) * (Number(item.qty) || 1)), 0);
}

// === BANDES DE FILTRES : BAGAGES ET CHRONO ===
function renderBaggageStrip(trip) {
  const strip = document.getElementById('baggageGrid');
  if (!strip) return;

  // Si on est en mode bagage, cette bande est le filtre principal
  const weights = calculateWeights(trip);
  const isAll = appState.filterBaggage === 'all';
  const totalKg = (getAllWeight(trip) / 1000).toFixed(1);

  let html = `
    <button type="button" class="bag-pill ${isAll ? 'active' : ''}" onclick="setBaggageFilter('all')">
      <div class="bag-pill-top">
        <span>Tous les bagages</span>
        <span class="bag-pill-weight">${totalKg} kg</span>
      </div>
      <div class="bag-pill-bar">
        <div class="bag-pill-fill" style="width: 100%"></div>
      </div>
    </button>
  `;

  for (const [key, bag] of Object.entries(trip.baggages)) {
    const bData = weights[key] || { current: 0 };
    const curKg = (bData.current / 1000).toFixed(1);
    const limitKg = (bag.limit / 1000).toFixed(0);
    const pct = bag.limit > 0 ? Math.min(100, Math.round((bData.current / bag.limit) * 100)) : 0;

    let fillClass = '';
    if (pct >= 100) fillClass = 'danger';
    else if (pct >= 85) fillClass = 'warning';

    const isActive = appState.filterBaggage === key;
    html += `
      <button type="button" class="bag-pill ${isActive ? 'active' : ''}" onclick="setBaggageFilter('${key}')">
        <div class="bag-pill-top">
          <span>${escapeHtml(bag.name)}</span>
          <span class="bag-pill-weight">${curKg}/${limitKg} kg</span>
        </div>
        <div class="bag-pill-bar">
          <div class="bag-pill-fill ${fillClass}" style="width: ${pct}%"></div>
        </div>
      </button>
    `;
  }

  strip.innerHTML = html;
}

function setBaggageFilter(key) {
  appState.filterBaggage = key;
  const trip = getActiveTrip();
  if (trip) {
    renderBaggageStrip(trip);
    renderList(trip);
  }
}

function renderChronoFilterStrip(trip) {
  const strip = document.getElementById('chronoFilterStrip');
  if (!strip) return;

  if (appState.viewMode !== 'chrono') {
    strip.style.display = 'none';
    return;
  }
  strip.style.display = 'flex';

  const isAll = appState.filterPhase === 'all';
  let html = `
    <button type="button" class="chrono-tab-pill ${isAll ? 'active' : ''}" onclick="setPhaseFilter('all')">
      <span>Toutes les étapes</span>
      <span class="pill-count">${trip.items.length}</span>
    </button>
  `;

  for (const [pKey, phase] of Object.entries(CHRONO_PHASES)) {
    const phaseItems = trip.items.filter(i => i.phase === pKey);
    const checked = phaseItems.filter(i => i.checked).length;
    const isActive = appState.filterPhase === pKey;
    const isDone = phaseItems.length > 0 && checked === phaseItems.length;

    html += `
      <button type="button" class="chrono-tab-pill ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}" onclick="setPhaseFilter('${pKey}')" style="--phase-color: ${phase.color}">
        <span class="pill-dot" style="background: ${phase.color}"></span>
        <span>${escapeHtml(phase.title)}</span>
        <span class="pill-count">${checked}/${phaseItems.length}</span>
      </button>
    `;
  }

  strip.innerHTML = html;
}

function setPhaseFilter(phaseKey) {
  appState.filterPhase = phaseKey;
  const trip = getActiveTrip();
  if (trip) {
    renderChronoFilterStrip(trip);
    renderList(trip);
  }
}

// === RENDU DE LA LISTE D'ARTICLES ===
function renderList(trip = getActiveTrip()) {
  const container = document.getElementById('categorySectionsContainer');
  if (!container || !trip) return;

  // Filtrage combiné
  const filtered = trip.items.filter(item => {
    // Filtre phase chronologique (si actif en mode chrono)
    if (appState.viewMode === 'chrono' && appState.filterPhase !== 'all' && item.phase !== appState.filterPhase) {
      return false;
    }
    // Filtre bagage
    if (appState.filterBaggage !== 'all' && item.baggage !== appState.filterBaggage) {
      return false;
    }
    // Filtre statut
    if (appState.filterStatus === 'todo' && item.checked) return false;
    if (appState.filterStatus === 'done' && !item.checked) return false;
    // Recherche textuelle
    if (appState.searchQuery) {
      const matchName = item.name.toLowerCase().includes(appState.searchQuery);
      const matchCat = (CATEGORIES[item.cat]?.name || '').toLowerCase().includes(appState.searchQuery);
      if (!matchName && !matchCat) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-filter-box">
        <p style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">Aucun article trouvé</p>
        <p style="font-size: 0.85rem;">Modifiez vos filtres ou ajoutez un nouvel article ci-dessous.</p>
      </div>
    `;
    return;
  }

  const isPlane = trip.transport === 'avion';

  // --- RENDU SELON LE VIEW MODE ---
  if (appState.viewMode === 'chrono') {
    renderChronoView(container, filtered, trip, isPlane);
  } else if (appState.viewMode === 'baggage') {
    renderBaggageView(container, filtered, trip, isPlane);
  } else {
    renderCategoryView(container, filtered, trip, isPlane);
  }
}

const COLLAPSE_CHEVRON_SVG = `<svg class="collapse-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;

function isSectionCollapsed(collapseKey) {
  return !appState.searchQuery && Boolean(appState.collapsedSections?.[collapseKey]);
}

function toggleSectionCollapse(collapseKey, headerEl) {
  if (!collapseKey) return;
  if (!appState.collapsedSections || typeof appState.collapsedSections !== 'object') {
    appState.collapsedSections = {};
  }
  const card = headerEl?.closest('section');
  const nextCollapsed = card
    ? !card.classList.contains('is-collapsed')
    : !appState.collapsedSections[collapseKey];

  if (nextCollapsed) {
    appState.collapsedSections[collapseKey] = true;
  } else {
    delete appState.collapsedSections[collapseKey];
  }

  if (card) card.classList.toggle('is-collapsed', nextCollapsed);
  if (headerEl) headerEl.setAttribute('aria-expanded', String(!nextCollapsed));
  saveState(false);
}

// 1. Vue Chronologique (Grandes étapes temporelles)
function renderChronoView(container, items, trip, isPlane) {
  const grouped = {};
  for (const pKey of Object.keys(CHRONO_PHASES)) grouped[pKey] = [];
  items.forEach(item => {
    const p = item.phase || 'phase_pack';
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(item);
  });

  let html = '';
  for (const [pKey, phase] of Object.entries(CHRONO_PHASES)) {
    const list = grouped[pKey] || [];
    if (list.length === 0) continue;

    const checkedCount = list.filter(i => i.checked).length;
    const isDone = checkedCount === list.length;
    const pct = Math.round((checkedCount / list.length) * 100);
    const collapseKey = `chrono:${pKey}`;
    const isCollapsed = isSectionCollapsed(collapseKey);

    html += `
      <section class="chrono-section-card ${isDone ? 'is-complete' : ''} ${isCollapsed ? 'is-collapsed' : ''}" id="chrono-sec-${pKey}">
        <div class="chrono-section-header" data-collapse-key="${escapeHtml(collapseKey)}" role="button" tabindex="0" aria-expanded="${!isCollapsed}" aria-controls="chrono-list-${pKey}" style="--section-accent: ${phase.color}; --section-accent-bg: ${phase.badgeBg}">
          <div class="chrono-header-left">
            <div class="chrono-icon-badge" style="color: ${phase.color}; background: ${phase.badgeBg};">
              ${phase.iconSvg}
            </div>
            <div>
              <div class="chrono-title-row">
                <span class="chrono-timing-badge" style="background: ${phase.badgeBg}; color: ${phase.color}">${escapeHtml(phase.timing)}</span>
                <h3 class="chrono-title">${escapeHtml(phase.title)}</h3>
              </div>
              <p class="chrono-subtitle">${escapeHtml(phase.subtitle)}</p>
            </div>
          </div>
          <div class="chrono-header-right">
            <div class="chrono-header-stats">
              <span class="chrono-count-badge ${isDone ? 'done' : ''}">${checkedCount}/${list.length}</span>
              <div class="chrono-mini-bar">
                <div class="chrono-mini-bar-fill" style="width: ${pct}%; background: ${phase.color}"></div>
              </div>
            </div>
            ${COLLAPSE_CHEVRON_SVG}
          </div>
        </div>
        <ul class="item-list" id="chrono-list-${pKey}">
          ${list.map(item => renderItemRow(item, trip, isPlane)).join('')}
        </ul>
      </section>
    `;
  }

  container.innerHTML = html;
}

// 2. Vue par Bagages
function renderBaggageView(container, items, trip, isPlane) {
  const bagOrder = [...Object.keys(trip.baggages), 'porte'];
  const grouped = {};
  bagOrder.forEach(k => grouped[k] = []);

  items.forEach(item => {
    const b = item.baggage || 'porte';
    if (!grouped[b]) grouped[b] = [];
    grouped[b].push(item);
  });

  let html = '';
  for (const bKey of bagOrder) {
    const list = grouped[bKey] || [];
    if (list.length === 0) continue;

    const bName = trip.baggages[bKey]?.name || (bKey === 'porte' ? 'Sur soi / Poches' : bKey);
    const checkedCount = list.filter(i => i.checked).length;
    const isDone = checkedCount === list.length;
    const bWeightKg = (list.reduce((sum, i) => sum + ((i.weight || 0) * (i.qty || 1)), 0) / 1000).toFixed(2);
    const collapseKey = `bag:${bKey}`;
    const isCollapsed = isSectionCollapsed(collapseKey);

    html += `
      <section class="category-card ${isCollapsed ? 'is-collapsed' : ''}" id="bag-sec-${bKey}">
        <div class="category-header" data-collapse-key="${escapeHtml(collapseKey)}" role="button" tabindex="0" aria-expanded="${!isCollapsed}" aria-controls="bag-list-${bKey}">
          <div class="category-title">
            <span>${escapeHtml(bName)}</span>
            <span style="font-size: 0.8rem; font-weight: 500; color: var(--text-muted);">· ${bWeightKg} kg</span>
          </div>
          <div class="category-header-right">
            <span class="category-count ${isDone ? 'done' : ''}">${checkedCount}/${list.length}</span>
            ${COLLAPSE_CHEVRON_SVG}
          </div>
        </div>
        <ul class="item-list" id="bag-list-${bKey}">
          ${list.map(item => renderItemRow(item, trip, isPlane)).join('')}
        </ul>
      </section>
    `;
  }

  container.innerHTML = html;
}

// 3. Vue par Catégories
function renderCategoryView(container, items, trip, isPlane) {
  const grouped = {};
  for (const cKey of Object.keys(CATEGORIES)) grouped[cKey] = [];
  items.forEach(item => {
    const c = item.cat || 'practical';
    if (!grouped[c]) grouped[c] = [];
    grouped[c].push(item);
  });

  let html = '';
  for (const [catKey, catInfo] of Object.entries(CATEGORIES)) {
    const list = grouped[catKey] || [];
    if (list.length === 0) continue;
    const checkedCount = list.filter(i => i.checked).length;
    const isDone = checkedCount === list.length;
    const collapseKey = `cat:${catKey}`;
    const isCollapsed = isSectionCollapsed(collapseKey);

    html += `
      <section class="category-card ${isCollapsed ? 'is-collapsed' : ''}" id="cat-sec-${catKey}">
        <div class="category-header" data-collapse-key="${escapeHtml(collapseKey)}" role="button" tabindex="0" aria-expanded="${!isCollapsed}" aria-controls="cat-list-${catKey}">
          <div class="category-title">
            <span class="cat-svg-icon">${catInfo.iconSvg}</span>
            <span>${escapeHtml(catInfo.name)}</span>
          </div>
          <div class="category-header-right">
            <span class="category-count ${isDone ? 'done' : ''}">${checkedCount}/${list.length}</span>
            ${COLLAPSE_CHEVRON_SVG}
          </div>
        </div>
        <ul class="item-list" id="cat-list-${catKey}">
          ${list.map(item => renderItemRow(item, trip, isPlane)).join('')}
        </ul>
      </section>
    `;
  }

  container.innerHTML = html;
}

// Rendu d'une ligne d'article
function renderItemRow(item, trip, isPlane) {
  const bagName = trip.baggages[item.baggage]?.name || (item.baggage === 'porte' ? 'Sur soi' : item.baggage);
  const phaseInfo = CHRONO_PHASES[item.phase] || CHRONO_PHASES.phase_pack;

  let iataBadge = '';
  if (isPlane) {
    if (item.iata === 'cabin-only') {
      iataBadge = `<span class="tag-iata tag-cabin">Cabine seule</span>`;
    } else if (item.iata === 'hold-only') {
      iataBadge = `<span class="tag-iata tag-hold">Soute seule</span>`;
    }
  }

  const weightStr = item.weight ? `${item.weight * (item.qty || 1)} g` : '';

  return `
    <li class="item-row ${item.checked ? 'checked' : ''}" id="row-${item.id}">
      <button type="button" class="item-checkbox ${item.checked ? 'checked' : ''}" onclick="toggleItem('${item.id}')" aria-label="Cocher ${escapeHtml(item.name)}">
        ${item.checked ? SVG_CHECK : ''}
      </button>
      <div class="item-body" onclick="toggleItem('${item.id}')">
        <div class="item-title-line">
          <span class="item-name">${escapeHtml(item.name)}</span>
          ${item.qty > 1 ? `<span class="item-qty">×${item.qty}</span>` : ''}
        </div>
        <div class="item-sub">
          <span class="tag-baggage">${escapeHtml(bagName)}</span>
          <span class="tag-phase" style="--p-color: ${phaseInfo.color}; --p-bg: ${phaseInfo.badgeBg}">${escapeHtml(phaseInfo.shortLabel)}</span>
          ${iataBadge}
        </div>
      </div>
      <div class="item-right">
        ${weightStr ? `<span class="item-weight">${weightStr}</span>` : ''}
        <div class="item-actions">
          <button type="button" class="icon-btn icon-btn-subtle" onclick="openItemModal('${item.id}')" title="Modifier" aria-label="Modifier">${SVG_EDIT}</button>
          <button type="button" class="icon-btn icon-btn-subtle icon-btn-danger" onclick="deleteItem('${item.id}')" title="Supprimer" aria-label="Supprimer">${SVG_TRASH}</button>
        </div>
      </div>
    </li>
  `;
}

// === ACTIONS SUR LES ARTICLES ===
function toggleItem(id) {
  const trip = getActiveTrip();
  const item = trip?.items.find(i => i.id === id);
  if (item) {
    item.checked = !item.checked;
    if (navigator.vibrate) {
      try { navigator.vibrate(15); } catch (e) {}
    }
    saveState();
  }
}

function deleteItem(id) {
  const trip = getActiveTrip();
  const item = trip?.items.find(i => i.id === id);
  if (!trip || !item) return;

  showConfirm("Supprimer l'article", `Retirer « ${item.name} » de la checklist ?`, "Supprimer", () => {
    trip.items = trip.items.filter(i => i.id !== id);
    saveState();
    showToast("Article supprimé");
  });
}

function openItemModal(editId = null) {
  const trip = getActiveTrip();
  if (!trip) return;

  const modal = document.getElementById('itemModal');
  const phaseSelect = document.getElementById('itemPhase');
  const catSelect = document.getElementById('itemCategory');
  const bagSelect = document.getElementById('itemBaggage');
  const iataGroup = document.getElementById('itemIataGroup');

  if (phaseSelect) {
    phaseSelect.innerHTML = Object.entries(CHRONO_PHASES).map(([k, p]) => `
      <option value="${k}">${p.timing} — ${p.title} (${p.subtitle})</option>
    `).join('');
  }

  if (catSelect) {
    catSelect.innerHTML = Object.entries(CATEGORIES).map(([k, c]) => `
      <option value="${k}">${c.name}</option>
    `).join('');
  }

  if (bagSelect) {
    let opts = '';
    for (const [key, bag] of Object.entries(trip.baggages)) {
      opts += `<option value="${key}">${escapeHtml(bag.name)}</option>`;
    }
    opts += `<option value="porte">Sur soi / Poches</option>`;
    bagSelect.innerHTML = opts;
  }

  if (iataGroup) {
    iataGroup.style.display = trip.transport === 'avion' ? 'block' : 'none';
  }

  const existing = editId ? trip.items.find(i => i.id === editId) : null;
  document.getElementById('itemModalTitle').textContent = existing ? "Modifier l'article" : "Nouvel article";
  document.getElementById('editItemId').value = existing ? existing.id : '';
  document.getElementById('itemName').value = existing ? existing.name : '';
  document.getElementById('itemPhase').value = existing ? (existing.phase || 'phase_pack') : 'phase_pack';
  document.getElementById('itemCategory').value = existing ? existing.cat : 'practical';
  document.getElementById('itemBaggage').value = existing ? existing.baggage : (appState.filterBaggage !== 'all' ? appState.filterBaggage : Object.keys(trip.baggages)[0]);
  document.getElementById('itemQty').value = existing ? existing.qty : 1;
  document.getElementById('itemWeight').value = existing ? existing.weight : '';
  document.getElementById('itemIata').value = existing ? (existing.iata || '') : '';

  modal.classList.add('open');
  setTimeout(() => document.getElementById('itemName').focus(), 100);
}

function closeItemModal() {
  document.getElementById('itemModal')?.classList.remove('open');
}

function saveItemForm() {
  const trip = getActiveTrip();
  if (!trip) return;

  const name = document.getElementById('itemName').value.trim();
  if (!name) return;

  const editId = document.getElementById('editItemId').value;
  const payload = {
    name,
    phase: document.getElementById('itemPhase').value,
    cat: document.getElementById('itemCategory').value,
    baggage: document.getElementById('itemBaggage').value,
    qty: parseInt(document.getElementById('itemQty').value) || 1,
    weight: parseInt(document.getElementById('itemWeight').value) || 0,
    iata: trip.transport === 'avion' ? document.getElementById('itemIata').value : ''
  };

  if (editId) {
    const idx = trip.items.findIndex(i => i.id === editId);
    if (idx !== -1) trip.items[idx] = { ...trip.items[idx], ...payload };
    showToast("Article mis à jour");
  } else {
    trip.items.push({ id: 'custom_' + Date.now(), ...payload, checked: false });
    showToast("Article ajouté");
  }

  closeItemModal();
  saveState();
}

// === GESTION MULTI-VOYAGES & FORMULAIRE DE CRÉATION ===
function openTripModal(trip = null) {
  const modal = document.getElementById('tripModal');
  const isEdit = Boolean(trip);

  document.getElementById('tripModalTitle').textContent = isEdit ? "Modifier le voyage" : "Nouveau voyage";
  document.getElementById('tripSubmitBtn').textContent = isEdit ? "Enregistrer" : "Créer la checklist";
  document.getElementById('editTripId').value = isEdit ? trip.id : '';
  document.getElementById('tripNameInput').value = isEdit ? trip.name : '';

  selectedCountryKey = isEdit ? trip.countryKey : 'france';
  selectedTransport = isEdit ? trip.transport : 'avion';
  selectedSeason = isEdit ? trip.season : 'misaison';
  selectedTripType = isEdit ? trip.tripType : 'weekend';
  selectedDays = isEdit
    ? (Number(trip.days) || TRIP_TYPES[trip.tripType]?.duration || 3)
    : (TRIP_TYPES[selectedTripType]?.duration || 3);

  if (isEdit && trip.party) {
    currentParty = normalizeParty(trip.party);
  } else {
    currentParty = {
      adultsMen: 1,
      adultsWomen: 0,
      teensBoys: 0,
      teensGirls: 0,
      childrenBoys: 0,
      childrenGirls: 0,
      babies: 0,
      pets: { enabled: false, dogs: 0, cats: 0, others: 0, takesPet: true }
    };
  }

  selectedActivities = new Set(isEdit && Array.isArray(trip.activities) ? trip.activities : []);

  selectCountry(selectedCountryKey);
  setTransportSelection(selectedTransport);
  setSeasonSelection(selectedSeason);
  setTripTypeSelection(selectedTripType, false);
  updatePartyDisplay();
  renderActivityChips();
  updatePrefillPreview();

  const regenGroup = document.getElementById('regenerateCheckGroup');
  if (regenGroup) {
    regenGroup.style.display = isEdit ? 'block' : 'none';
    document.getElementById('tripRegenerateItems').checked = false;
  }

  modal.classList.add('open');
}

function closeTripModal() {
  document.getElementById('tripModal')?.classList.remove('open');
}

function saveTripForm() {
  const editId = document.getElementById('editTripId').value;
  const countryKey = selectedCountryKey;
  const tripType = selectedTripType;
  const daysInputVal = parseInt(document.getElementById('tripDaysInput')?.value, 10);
  const days = Math.max(1, Math.min(365, isNaN(daysInputVal) ? selectedDays : daysInputVal));
  const season = selectedSeason;
  const transport = selectedTransport;
  const activities = Array.from(selectedActivities);
  const party = JSON.parse(JSON.stringify(currentParty));

  let name = document.getElementById('tripNameInput').value.trim();
  if (!name) {
    const cName = COUNTRIES[countryKey]?.name || 'Voyage';
    const sClean = (SEASONS[season]?.label || '').split('/')[0].trim();
    name = `${cName} — ${sClean}`;
  }

  if (editId) {
    const trip = appState.trips.find(t => t.id === editId);
    if (trip) {
      trip.name = name;
      trip.countryKey = countryKey;
      trip.tripType = tripType;
      trip.days = days;
      trip.season = season;
      trip.transport = transport;
      trip.party = party;
      trip.activities = activities;

      const regen = document.getElementById('tripRegenerateItems')?.checked;
      if (regen) {
        const fresh = generateChecklist({ countryKey, tripType, season, transport, activities, party, days });
        trip.baggages = fresh.baggages;
        trip.items = fresh.items;
      } else {
        trip.baggages = JSON.parse(JSON.stringify((TRANSPORTS[transport] || TRANSPORTS.avion).baggages));
      }
      showToast("Voyage mis à jour");
    }
  } else {
    const newTrip = createTripObject({ name, countryKey, tripType, season, transport, activities, party, days });
    appState.trips.push(newTrip);
    appState.activeTripId = newTrip.id;
    appState.filterBaggage = 'all';
    appState.filterPhase = 'all';
    showToast(`Checklist « ${name} » créée (${newTrip.items.length} articles)`);
  }

  closeTripModal();
  saveState();
}

function createQuickPreset(presetKey) {
  const presets = {
    japon: {
      name: "Grand Voyage Japon",
      countryKey: "japon",
      tripType: "long",
      season: "misaison",
      transport: "avion",
      activities: ["photo", "culture", "soiree"],
      party: { adultsMen: 1, adultsWomen: 1, teensBoys: 0, teensGirls: 0, childrenBoys: 0, childrenGirls: 0, babies: 0, pets: { enabled: false } }
    },
    famille: {
      name: "Vacances Famille & Chien",
      countryKey: "france",
      tripType: "plage",
      season: "ete",
      transport: "voiture",
      activities: ["plage", "lecture", "jeux"],
      party: { adultsMen: 1, adultsWomen: 1, teensBoys: 0, teensGirls: 0, childrenBoys: 1, childrenGirls: 0, babies: 1, pets: { enabled: true, type: "chien", takesPet: true } }
    },
    ski: {
      name: "Séjour Ski & Montagne",
      countryKey: "france",
      tripType: "ski",
      season: "hiver",
      transport: "voiture",
      activities: ["ski", "soiree"],
      party: { adultsMen: 1, adultsWomen: 1, teensBoys: 1, teensGirls: 0, childrenBoys: 0, childrenGirls: 0, babies: 0, pets: { enabled: false } }
    },
    city: {
      name: "City-trip Londres",
      countryKey: "angleterre",
      tripType: "weekend",
      season: "misaison",
      transport: "avion",
      activities: ["culture", "soiree"],
      party: { adultsMen: 1, adultsWomen: 1, teensBoys: 0, teensGirls: 0, childrenBoys: 0, childrenGirls: 0, babies: 0, pets: { enabled: false } }
    }
  };
  const cfg = presets[presetKey];
  if (!cfg) return;
  const newTrip = createTripObject(cfg);
  appState.trips.push(newTrip);
  appState.activeTripId = newTrip.id;
  appState.filterBaggage = 'all';
  appState.filterPhase = 'all';
  saveState();
  showToast(`Checklist « ${newTrip.name} » prête`);
}

function deleteTripById(tripId) {
  const trip = appState.trips.find(t => t.id === tripId);
  if (!trip) return;

  showConfirm("Supprimer le voyage", `Supprimer définitivement « ${trip.name} » ?`, "Supprimer", () => {
    appState.trips = appState.trips.filter(t => t.id !== tripId);
    if (appState.activeTripId === tripId) {
      appState.activeTripId = appState.trips[0]?.id || null;
      appState.filterBaggage = 'all';
      appState.filterPhase = 'all';
    }
    saveState();
    if (document.getElementById('tripsModal').classList.contains('open')) {
      renderTripsList();
    }
    showToast("Voyage supprimé");
  });
}

// === TRIP SWITCHER MODAL ===
function openTripsModal() {
  renderTripsList();
  document.getElementById('tripsModal')?.classList.add('open');
}

function closeTripsModal() {
  document.getElementById('tripsModal')?.classList.remove('open');
}

function renderTripsList() {
  const container = document.getElementById('tripsListContainer');
  if (!container) return;

  if (appState.trips.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px 0; font-size: 0.9rem;">Aucun voyage enregistré.</p>`;
    return;
  }

  container.innerHTML = appState.trips.map(t => {
    const isActive = t.id === appState.activeTripId;
    const c = COUNTRIES[t.countryKey] || COUNTRIES.france;
    const done = t.items.filter(i => i.checked).length;
    return `
      <div class="list-card ${isActive ? 'active' : ''}">
        <div class="list-card-info" onclick="selectTrip('${t.id}')">
          <h4>${c.flag} ${escapeHtml(t.name)}</h4>
          <p>${done}/${t.items.length} préparés · ${(getAllWeight(t) / 1000).toFixed(1)} kg</p>
        </div>
        <div class="list-card-actions">
          <button type="button" class="icon-btn icon-btn-subtle icon-btn-danger" onclick="deleteTripById('${t.id}')" title="Supprimer" aria-label="Supprimer">${SVG_TRASH}</button>
        </div>
      </div>
    `;
  }).join('');
}

function selectTrip(tripId) {
  appState.activeTripId = tripId;
  appState.filterBaggage = 'all';
  appState.filterPhase = 'all';
  closeTripsModal();
  saveState();
}

// === MODÈLES & CHECKLISTS ===
function openTemplatesModal() {
  renderTemplatesList();
  document.getElementById('templatesModal')?.classList.add('open');
}

function closeTemplatesModal() {
  document.getElementById('templatesModal')?.classList.remove('open');
}

function renderTemplatesList() {
  const container = document.getElementById('templatesListContainer');
  if (!container) return;

  const saveBtn = document.getElementById('btnSaveAsTemplate');
  if (saveBtn) saveBtn.style.display = getActiveTrip() ? 'inline-flex' : 'none';

  let html = '';

  if (appState.customTemplates.length > 0) {
    html += `<p class="section-micro-label">Mes modèles personnalisés</p>`;
    html += appState.customTemplates.map(tpl => `
      <div class="list-card">
        <div class="list-card-info">
          <h4>${escapeHtml(tpl.name)}</h4>
          <p>${tpl.items.length} articles · ${COUNTRIES[tpl.countryKey]?.name || ''}</p>
        </div>
        <div class="list-card-actions">
          <button class="btn btn-primary btn-sm" onclick="loadCustomTemplate('${tpl.id}')">Utiliser</button>
          <button class="icon-btn icon-btn-subtle icon-btn-danger" onclick="deleteCustomTemplate('${tpl.id}')" aria-label="Supprimer">${SVG_TRASH}</button>
        </div>
      </div>
    `).join('');
  }

  html += `<p class="section-micro-label">Modèles prédéfinis</p>`;
  html += DEFAULT_TEMPLATES.map(tpl => `
    <div class="list-card">
      <div class="list-card-info">
        <h4>${escapeHtml(tpl.name)}</h4>
        <p>${TRIP_TYPES[tpl.tripType]?.label || ''} · ${TRANSPORTS[tpl.transport]?.label || ''}</p>
      </div>
      <div class="list-card-actions">
        <button class="btn btn-secondary btn-sm" onclick="loadDefaultTemplate('${tpl.id}')">Utiliser</button>
      </div>
    </div>
  `).join('');

  container.innerHTML = html;
}

function saveCurrentTripAsTemplate() {
  const trip = getActiveTrip();
  if (!trip) return;

  const newTpl = {
    id: 'ctpl_' + Date.now(),
    name: trip.name,
    countryKey: trip.countryKey,
    tripType: trip.tripType,
    season: trip.season,
    transport: trip.transport,
    party: trip.party || currentParty,
    activities: trip.activities || [],
    baggages: JSON.parse(JSON.stringify(trip.baggages)),
    items: JSON.parse(JSON.stringify(trip.items)).map(i => ({ ...i, checked: false }))
  };

  appState.customTemplates.push(newTpl);
  saveState(false);
  renderTemplatesList();
  showToast(`Modèle « ${newTpl.name} » enregistré`);
}

function createBlankTrip() {
  const newTrip = createTripObject({
    name: "Checklist vierge",
    countryKey: "france",
    tripType: "weekend",
    season: "misaison",
    transport: "avion",
    blank: true
  });
  appState.trips.push(newTrip);
  appState.activeTripId = newTrip.id;
  appState.filterBaggage = 'all';
  appState.filterPhase = 'all';
  closeTemplatesModal();
  saveState();
  showToast("Checklist vierge créée");
}

function loadDefaultTemplate(tplId) {
  const tpl = DEFAULT_TEMPLATES.find(t => t.id === tplId);
  if (!tpl) return;
  const newTrip = createTripObject({
    name: tpl.name,
    countryKey: tpl.countryKey,
    tripType: tpl.tripType,
    season: tpl.season,
    transport: tpl.transport,
    activities: tpl.activities || [],
    party: normalizeParty(tpl.party)
  });
  appState.trips.push(newTrip);
  appState.activeTripId = newTrip.id;
  appState.filterBaggage = 'all';
  appState.filterPhase = 'all';
  closeTemplatesModal();
  saveState();
  showToast(`Modèle chargé`);
}

function loadCustomTemplate(tplId) {
  const tpl = appState.customTemplates.find(t => t.id === tplId);
  if (!tpl) return;
  const newTrip = {
    id: 'trip_' + Date.now(),
    name: tpl.name,
    countryKey: tpl.countryKey,
    tripType: tpl.tripType,
    season: tpl.season,
    transport: tpl.transport,
    party: normalizeParty(tpl.party),
    activities: tpl.activities || [],
    baggages: JSON.parse(JSON.stringify(tpl.baggages)),
    items: JSON.parse(JSON.stringify(tpl.items)).map(i => ({ ...i, checked: false }))
  };
  appState.trips.push(newTrip);
  appState.activeTripId = newTrip.id;
  appState.filterBaggage = 'all';
  appState.filterPhase = 'all';
  closeTemplatesModal();
  saveState();
  showToast(`Modèle chargé`);
}

function deleteCustomTemplate(tplId) {
  appState.customTemplates = appState.customTemplates.filter(t => t.id !== tplId);
  saveState(false);
  renderTemplatesList();
  showToast("Modèle supprimé");
}

// === EXPORT / IMPORT ===
function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `valise-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  showToast("Sauvegarde exportée");
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const data = JSON.parse(event.target.result);
      if (data && Array.isArray(data.trips)) {
        appState = { ...appState, ...data };
        if (appState.trips.length > 0 && !appState.activeTripId) {
          appState.activeTripId = appState.trips[0].id;
        }
        saveState();
        showToast("Sauvegarde importée avec succès");
      }
    } catch (err) {
      showToast("Erreur lors de la lecture du fichier JSON");
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
