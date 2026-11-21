// Données de référence : Catégories, Chronologie, Types de voyage, Saisons, Transports et 32 Pays

// === PHASES CHRONOLOGIQUES ===
const CHRONO_PHASES = {
  phase_6months: {
    id: "phase_6months",
    title: "En amont",
    subtitle: "6 mois ou plus avant le départ",
    shortLabel: "6 mois+",
    timing: "≥ 6 mois",
    color: "#8b5cf6", // Améthyste
    badgeBg: "rgba(139, 92, 246, 0.12)",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>`
  },
  phase_prep: {
    id: "phase_prep",
    title: "Préparatifs",
    subtitle: "Entre 6 mois et la semaine du départ",
    shortLabel: "6m à J-7",
    timing: "6m à J-7",
    color: "#3b82f6", // Saphir / Cobalt
    badgeBg: "rgba(59, 130, 246, 0.12)",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
  },
  phase_pack: {
    id: "phase_pack",
    title: "La Valise",
    subtitle: "Quelques jours avant le départ",
    shortLabel: "J-3 à J-1",
    timing: "J-3 à J-1",
    color: "#06b6d4", // Cyan
    badgeBg: "rgba(6, 182, 212, 0.12)",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`
  },
  phase_departure: {
    id: "phase_departure",
    title: "Jour J & Maison",
    subtitle: "Le jour du départ avant de fermer la porte",
    shortLabel: "Jour J",
    timing: "Jour J",
    color: "#f59e0b", // Ambre
    badgeBg: "rgba(245, 158, 11, 0.12)",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
  },
  phase_return: {
    id: "phase_return",
    title: "Au Retour",
    subtitle: "Avant de quitter le lieu de séjour & check valise",
    shortLabel: "Retour",
    timing: "Retour",
    color: "#10b981", // Émeraude
    badgeBg: "rgba(16, 185, 129, 0.12)",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>`
  }
};

// === CATÉGORIES D'ARTICLES ===
const CATEGORIES = {
  admin: {
    name: "Papiers, Visas & Santé",
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h6"/></svg>`
  },
  house: {
    name: "Maison & Sécurité",
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
  },
  clothes: {
    name: "Vêtements & Chaussures",
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>`
  },
  tech: {
    name: "Tech & Électronique",
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`
  },
  hygiene: {
    name: "Hygiène & Soins",
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21h10"/><path d="M12 21a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 10.1 5 12 5 14a7 7 0 0 0 7 7z"/></svg>`
  },
  health: {
    name: "Santé & Pharmacie",
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`
  },
  baby: {
    name: "Bébé, Enfants & Ados",
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`
  },
  pet: {
    name: "Animaux de compagnie",
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 20.14A3.5 3.5 0 0 1 2 15a5 5 0 0 1 7-5Z"/></svg>`
  },
  practical: {
    name: "Équipements & Activités",
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>`
  },
  souvenirs: {
    name: "Check Retour & Souvenirs",
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`
  }
};

// === TYPES DE VOYAGE ===
const TRIP_TYPES = {
  weekend: {
    label: "Week-end / Court séjour",
    desc: "2 à 4 jours · Bagage léger",
    duration: 3,
    clothesQty: 3,
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
  },
  long: {
    label: "Grand Voyage",
    desc: "10 jours et plus · Valise complète",
    duration: 15,
    clothesQty: 7,
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`
  },
  roadtrip: {
    label: "Roadtrip Itinérant",
    desc: "Changement d'hébergement régulier",
    duration: 10,
    clothesQty: 5,
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`
  },
  citytrip: {
    label: "City-trip urbain",
    desc: "3 à 5 jours · Musées & balades",
    duration: 4,
    clothesQty: 4,
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="22.01"/><line x1="15" y1="22" x2="15.01" y2="22.01"/><line x1="9" y1="6" x2="9.01" y2="6"/><line x1="15" y1="6" x2="15.01" y2="6"/><line x1="9" y1="10" x2="9.01" y2="10"/><line x1="15" y1="10" x2="15.01" y2="10"/><line x1="9" y1="14" x2="9.01" y2="14"/><line x1="15" y1="14" x2="15.01" y2="14"/></svg>`
  },
  plage: {
    label: "Plage & Détente",
    desc: "Bord de mer, soleil et farniente",
    duration: 7,
    clothesQty: 6,
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
  },
  bivouac: {
    label: "Bivouac & Trek",
    desc: "Autonomie complète en nature",
    duration: 4,
    clothesQty: 3,
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`
  },
  camping: {
    label: "Camping",
    desc: "En tente ou bungalow aménagé",
    duration: 7,
    clothesQty: 5,
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 20-7-14-7 14h14Z"/><path d="M12 6v14"/><path d="m9 20 3-7 3 7"/></svg>`
  },
  ski: {
    label: "Ski & Montagne hiver",
    desc: "Séjour aux sports d'hiver",
    duration: 7,
    clothesQty: 5,
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 10-10"/><path d="m12 12 8-8"/><path d="m18 10 2 2-6 6-2-2Z"/><path d="m4 16 2 2"/></svg>`
  }
};

// === SAISONS & CLIMATS ===
const SEASONS = {
  ete: {
    label: "Été / Climat chaud",
    desc: "Soleil, baignade et températures élevées",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`
  },
  misaison: {
    label: "Printemps / Automne",
    desc: "Climat tempéré, soirées fraîches",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`
  },
  hiver: {
    label: "Hiver / Climat froid",
    desc: "Basses températures, neige ou gel",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/></svg>`
  },
  tropical: {
    label: "Tropical / Humide",
    desc: "Chaleur humide, averses soudaines",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`
  }
};

// === ACTIVITÉS PRÉVUES (ENRICHIES) ===
const ACTIVITIES = {
  lecture: {
    id: "lecture",
    label: "Lecture & Détente",
    desc: "Liseuse, livres, coussin nomade",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`
  },
  soiree: {
    id: "soiree",
    label: "Soirée & Restaurant",
    desc: "Tenue chic, chemise, robe habillée",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h8"/><path d="M12 11v11"/><path d="m19 3-7 8-7-8Z"/></svg>`
  },
  plage: {
    id: "plage",
    label: "Plage & Baignade",
    desc: "Maillots, serviette microfibre, masque",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/></svg>`
  },
  piscine: {
    id: "piscine",
    label: "Piscine & Spa",
    desc: "Bain, claquettes spa, bonnet",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>`
  },
  randonnee: {
    id: "randonnee",
    label: "Randonnée & Nature",
    desc: "Chaussures rando, sac à dos, gourde",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`
  },
  ski: {
    id: "ski",
    label: "Ski / Glisse hiver",
    desc: "Skis, blouson, masque, gants chauds",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 10-10"/><path d="m12 12 8-8"/><path d="m18 10 2 2-6 6-2-2Z"/><path d="m4 16 2 2"/></svg>`
  },
  camping: {
    id: "camping",
    label: "Camping / Bivouac",
    desc: "Tente, sac de couchage, réchaud",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 20-7-14-7 14h14Z"/><path d="M12 6v14"/><path d="m9 20 3-7 3 7"/></svg>`
  },
  sport: {
    id: "sport",
    label: "Sport & Running",
    desc: "Baskets running, tenue respirante",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>`
  },
  velo: {
    id: "velo",
    label: "Vélo & Cyclisme",
    desc: "Cuissard, casque vélo, kit réparation",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`
  },
  culture: {
    id: "culture",
    label: "Culture & Musées",
    desc: "Guide de voyage, coupe-files, carnet",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v2H3V9z"/><path d="M5 11v7"/><path d="M9 11v7"/><path d="M15 11v7"/><path d="M19 11v7"/><path d="M2 18h20v4H2v-4z"/></svg>`
  },
  nautique: {
    id: "nautique",
    label: "Activités Nautiques",
    desc: "Aquashoes, pochette étanche, lycra",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><line x1="12" y1="12" x2="12" y2="5"/></svg>`
  },
  jeux: {
    id: "jeux",
    label: "Jeux & Divertissements",
    desc: "Jeux de société nomades, cartes",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/></svg>`
  },
  pro: {
    id: "pro",
    label: "Travail & Pro",
    desc: "PC portable, chargeur, badge, carnet",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`
  },
  photo: {
    id: "photo",
    label: "Photo & Vidéo",
    desc: "Boîtier reflex/hybride, objectifs, cartes SD",
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`
  }
};

// === TRANSPORTS ===
const TRANSPORTS = {
  avion: {
    label: "Avion",
    sub: "Soute, Cabine & Sac à dos",
    showIata: true,
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
    baggages: {
      soute: { name: "Valise Soute", limit: 23000 },
      cabine: { name: "Valise Cabine", limit: 8000 },
      daypack: { name: "Sac à dos / Personnel", limit: 4000 }
    }
  },
  train: {
    label: "Train",
    sub: "Grande valise & Sacoche cabine",
    showIata: false,
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/><path d="m6 19-2 2"/><path d="m18 19 2 2"/></svg>`,
    baggages: {
      soute: { name: "Grande Valise / Sac", limit: 25000 },
      daypack: { name: "Sac à dos / Cabine", limit: 6000 }
    }
  },
  voiture: {
    label: "Voiture",
    sub: "Coffre & Sac habitacle",
    showIata: false,
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 3c-.1.2-.1.4-.1.6v4.5c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
    baggages: {
      soute: { name: "Coffre / Bagage principal", limit: 40000 },
      daypack: { name: "Sac habitacle", limit: 6000 }
    }
  },
  bateau: {
    label: "Bateau / Ferry",
    sub: "Bagage principal & Sac cabine",
    showIata: false,
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1 2.4 2.4 0 0 1 2-1 2.4 2.4 0 0 1 2 1 2.4 2.4 0 0 0 2 1 2.4 2.4 0 0 0 2-1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><line x1="12" y1="12" x2="12" y2="5"/></svg>`,
    baggages: {
      soute: { name: "Bagage principal", limit: 25000 },
      cabine: { name: "Sac traversée / Cabine", limit: 6000 }
    }
  }
};

// 32 Pays & Destinations classés par région
// riskLevel: 'safe' | 'caution' (alerte visuelle si zones de vigilance)
const COUNTRIES = {
  // === EUROPE ===
  france: {
    name: "France (Métropole / Corse)",
    flag: "🇫🇷",
    region: "Europe",
    riskLevel: "safe",
    plug: "Type E (standard français)",
    currency: "Euro (€)",
    docs: [
      "Carte Nationale d'Identité (CNI) ou Passeport",
      "Carte Vitale + Mutuelle",
      "Permis de conduire (si location/voiture)"
    ],
    accessories: []
  },
  espagne: {
    name: "Espagne",
    flag: "🇪🇸",
    region: "Europe",
    riskLevel: "safe",
    plug: "Type F (compatible France)",
    currency: "Euro (€)",
    docs: [
      "CNI ou Passeport valide",
      "Carte Européenne d'Assurance Maladie (CEAM)"
    ],
    accessories: [
      "Éventail / Brume fraîcheur (été)",
      "Pochette antivol discrète (zones touristiques Barcelone/Madrid)"
    ]
  },
  andorre: {
    name: "Andorre",
    flag: "🇦🇩",
    region: "Europe",
    riskLevel: "safe",
    plug: "Type F (compatible France)",
    currency: "Euro (€)",
    docs: [
      "CNI ou Passeport valide (hors UE, contrôle douanier possible)",
      "Assurance voyage / carte européenne (CEAM non valable hors UE : vérifier mutuelle)"
    ],
    accessories: [
      "Vérifier l'itinérance mobile (Andorre est souvent hors forfait UE !)",
      "Chaînes / équipements neige (si hiver en voiture)"
    ]
  },
  croatie: {
    name: "Croatie",
    flag: "🇭🇷",
    region: "Europe",
    riskLevel: "safe",
    plug: "Type F (compatible France)",
    currency: "Euro (€)",
    docs: [
      "CNI ou Passeport valide (Espace Schengen)",
      "Carte Européenne d'Assurance Maladie (CEAM)"
    ],
    accessories: [
      "Chaussures d'eau / aquashoes (plages de galets & oursins)",
      "Masque et tuba (eaux cristallines)"
    ]
  },
  pologne: {
    name: "Pologne",
    flag: "🇵🇱",
    region: "Europe",
    riskLevel: "safe",
    plug: "Type E (identique France)",
    currency: "Złoty (PLN)",
    docs: [
      "CNI ou Passeport valide",
      "Carte Européenne d'Assurance Maladie (CEAM)"
    ],
    accessories: [
      "Carte bancaire sans frais de change (paiement sans contact partout)"
    ]
  },
  allemagne: {
    name: "Allemagne",
    flag: "🇩🇪",
    region: "Europe",
    riskLevel: "safe",
    plug: "Type F (compatible France)",
    currency: "Euro (€)",
    docs: [
      "CNI ou Passeport valide",
      "Carte Européenne d'Assurance Maladie (CEAM)"
    ],
    accessories: [
      "Espèces en Euros (beaucoup de commerces/restaurants refusent la carte)",
      "Vignette environnementale Umweltplakette (si entrée en ville en voiture)"
    ]
  },
  irlande: {
    name: "Irlande",
    flag: "🇮🇪",
    region: "Europe",
    riskLevel: "safe",
    plug: "Type G (3 broches rectangulaires UK)",
    currency: "Euro (€)",
    docs: [
      "Passeport recommandé (ou CNI valide ; hors espace Schengen)",
      "Carte Européenne d'Assurance Maladie (CEAM)"
    ],
    accessories: [
      "Adaptateur secteur Type G (obligatoire !)",
      "Veste imperméable coupe-vent + pantalon pluie (météo changeante)"
    ]
  },
  angleterre: {
    name: "Angleterre / Royaume-Uni",
    flag: "🇬🇧",
    region: "Europe",
    riskLevel: "safe",
    plug: "Type G (3 broches rectangulaires)",
    currency: "Livre Sterling (£ / GBP)",
    docs: [
      "Passeport valide obligatoire (CNI non acceptée)",
      "Autorisation électronique ETA UK (à demander en ligne avant départ)",
      "Assurance voyage santé (CEAM / GHIC selon accord)"
    ],
    accessories: [
      "Adaptateur secteur Type G (obligatoire !)",
      "Parapluie compact résistant au vent",
      "Carte bancaire sans frais en devises (£)"
    ]
  },
  italie: {
    name: "Italie",
    flag: "🇮🇹",
    region: "Europe",
    riskLevel: "safe",
    plug: "Type L / F (prévoir adaptateur fin ou multiprise)",
    currency: "Euro (€)",
    docs: [
      "CNI ou Passeport valide",
      "Carte Européenne d'Assurance Maladie (CEAM)"
    ],
    accessories: [
      "Adaptateur Type L (prises italiennes à 3 broches alignées)",
      "Foulard / tenue couvrante épaules & genoux (visite églises/Vatican)"
    ]
  },
  portugal: {
    name: "Portugal",
    flag: "🇵🇹",
    region: "Europe",
    riskLevel: "safe",
    plug: "Type F (compatible France)",
    currency: "Euro (€)",
    docs: [
      "CNI ou Passeport valide",
      "Carte Européenne d'Assurance Maladie (CEAM)"
    ],
    accessories: [
      "Chaussures à semelle antidérapante (pavés glissants à Lisbonne/Porto)",
      "Coupe-vent (brise atlantique le soir)"
    ]
  },
  grece: {
    name: "Grèce",
    flag: "🇬🇷",
    region: "Europe",
    riskLevel: "safe",
    plug: "Type F (compatible France)",
    currency: "Euro (€)",
    docs: [
      "CNI ou Passeport valide",
      "Carte Européenne d'Assurance Maladie (CEAM)"
    ],
    accessories: [
      "Répulsif anti-moustiques",
      "Chaussures d'eau & protection solaire indice 50+"
    ]
  },
  suisse: {
    name: "Suisse",
    flag: "🇨🇭",
    region: "Europe",
    riskLevel: "safe",
    plug: "Type J (3 broches : fiches plates/rondes, fiches françaises 2 broches OK)",
    currency: "Franc Suisse (CHF)",
    docs: [
      "CNI ou Passeport valide",
      "Carte Européenne d'Assurance Maladie (CEAM)"
    ],
    accessories: [
      "Adaptateur Type J (pour prises avec terre)",
      "Vignette autoroute suisse (si voiture)",
      "Vérifier le forfait roaming Suisse (souvent hors UE !)"
    ]
  },
  norvege: {
    name: "Norvège",
    flag: "🇳🇴",
    region: "Europe",
    riskLevel: "safe",
    plug: "Type F (compatible France)",
    currency: "Couronne Norvégienne (NOK)",
    docs: [
      "CNI ou Passeport valide (Espace Schengen)",
      "Carte Européenne d'Assurance Maladie (CEAM)"
    ],
    accessories: [
      "Masque de nuit (jour polaire en été)",
      "Gourde réutilisable (eau du robinet excellente partout)"
    ]
  },
  islande: {
    name: "Islande",
    flag: "🇮🇸",
    region: "Autre / Grand Nord",
    riskLevel: "safe",
    plug: "Type F (compatible France)",
    currency: "Couronne Islandaise (ISK)",
    docs: [
      "CNI ou Passeport valide (Espace Schengen)",
      "Carte Européenne d'Assurance Maladie (CEAM)"
    ],
    accessories: [
      "Maillot de bain + serviette microfibre (sources chaudes / Blue Lagoon)",
      "Veste coupe-vent imperméable + pantalon imperméable",
      "Crampons légers de marche (si hiver/glace)"
    ]
  },
  laponie: {
    name: "Laponie (Finlande)",
    flag: "🇫🇮",
    region: "Autre / Grand Nord",
    riskLevel: "safe",
    plug: "Type F (compatible France)",
    currency: "Euro (€)",
    docs: [
      "CNI ou Passeport valide",
      "Carte Européenne d'Assurance Maladie (CEAM)"
    ],
    accessories: [
      "Chaufferettes mains et pieds",
      "Sous-couches laine mérinos + cagoule / tour de cou polaire",
      "Batterie externe gardée au chaud (le froid vide les batteries)"
    ]
  },

  // === ASIE ===
  japon: {
    name: "Japon",
    flag: "🇯🇵",
    region: "Asie",
    riskLevel: "safe",
    plug: "Type A (fiches plates sans terre, 100V)",
    currency: "Yen (JPY)",
    docs: [
      "Passeport valide (séjour < 90 jours sans visa)",
      "QR Codes Visit Japan Web (Douane & Immigration)",
      "Permis de conduire + Traduction officielle JAF (si location voiture)"
    ],
    accessories: [
      "Adaptateur secteur Type A (x2)",
      "Yens en espèces + pochette à pièces",
      "Chaussettes propres sans trous (pour les temples & ryokans)",
      "Chaussures faciles à enlever/remettre",
      "eSIM ou Pocket Wi-Fi"
    ]
  },
  thailande: {
    name: "Thaïlande",
    flag: "🇹🇭",
    region: "Asie",
    riskLevel: "safe",
    plug: "Type A / B / C (fiches françaises 2 broches souvent compatibles)",
    currency: "Baht (THB)",
    docs: [
      "Passeport valide > 6 mois après le retour",
      "Vérifier vaccins recommandés (Hépatite A, Typhoïde) & assurance santé"
    ],
    accessories: [
      "Répulsif moustiques zones tropicales (DEET / Icaridine)",
      "Tenue légère couvrant épaules et genoux (visite des temples)",
      "Pochette étanche téléphone (pluie/bateau)"
    ]
  },
  chine: {
    name: "Chine",
    flag: "🇨🇳",
    region: "Asie",
    riskLevel: "caution",
    riskAlert: "Vigilance numérique & paiements : installez Alipay/WeChat Pay et un VPN avant le départ (Google, WhatsApp, Instagram sont bloqués sur place).",
    plug: "Type A / I (fiches plates parallèles ou obliques)",
    currency: "Yuan (CNY)",
    docs: [
      "Passeport valide > 6 mois + Visa (ou vérifier exemption temporaire en vigueur)",
      "Assurance rapatriement obligatoire/recommandée",
      "Vérifier vaccins recommandés (Hépatite A, DTP)"
    ],
    accessories: [
      "Adaptateur universel (Type A & I)",
      "Applications Alipay & WeChat Pay configurées avec carte bancaire",
      "eSIM internationale ou VPN installé AVANT le départ",
      "Traducteur hors-ligne téléchargé"
    ]
  },
  bali: {
    name: "Bali / Indonésie",
    flag: "🇮🇩",
    region: "Asie",
    riskLevel: "safe",
    plug: "Type C / F (compatible France)",
    currency: "Roupie Indonésienne (IDR)",
    docs: [
      "Passeport valide > 6 mois",
      "e-VOA (Visa on Arrival) + Taxe touristique Bali (Love Bali) + Déclaration douane électronique",
      "Vaccins recommandés : Hépatite A, Typhoïde, DTP"
    ],
    accessories: [
      "Répulsif moustiques tropical",
      "Sarong ou foulard (entrée des temples)",
      "Probiotiques & pansements gastriques (Bali Belly)",
      "Crème solaire respectueuse des coraux"
    ]
  },
  vietnam: {
    name: "Vietnam",
    flag: "🇻🇳",
    region: "Asie",
    riskLevel: "safe",
    plug: "Type A / C (fiches françaises souvent compatibles)",
    currency: "Dong (VND)",
    docs: [
      "Passeport valide > 6 mois (exemption < 45j ou e-Visa)",
      "Vaccins recommandés : Hépatite A, Typhoïde"
    ],
    accessories: [
      "Adaptateur Type A/C",
      "Poncho de pluie léger (averses soudaines)",
      "Répulsif moustiques tropical"
    ]
  },
  coree: {
    name: "Corée du Sud",
    flag: "🇰🇷",
    region: "Asie",
    riskLevel: "safe",
    plug: "Type F (compatible France)",
    currency: "Won (KRW)",
    docs: [
      "Passeport valide",
      "K-ETA (vérifier si exemption temporaire applicable)",
      "Q-CODE si requis"
    ],
    accessories: [
      "Applications Naver Map / KakaoMap (Google Maps fonctionne mal)",
      "Carte T-Money (transports en commun)"
    ]
  },

  // === AMÉRIQUE DU NORD ===
  usa: {
    name: "États-Unis",
    flag: "🇺🇸",
    region: "Amérique du Nord",
    riskLevel: "caution",
    riskAlert: "Vigilance santé & sécurité : frais médicaux extrêmement élevés (assurance santé plafonds > 300 000 € indispensable). Prudence dans certains quartiers urbains la nuit.",
    plug: "Type A / B (fiches plates, 110V)",
    currency: "Dollar US ($ / USD)",
    docs: [
      "Passeport biométrique valide",
      "Autorisation ESTA approuvée (au moins 72h avant départ)",
      "Assurance santé / rapatriement à plafond élevé"
    ],
    accessories: [
      "Adaptateur secteur Type A/B (x2)",
      "Cadenas TSA homologué pour valise soute",
      "Carte bancaire sans frais + pourboires en espèces ($)"
    ]
  },
  canada: {
    name: "Canada",
    flag: "🇨🇦",
    region: "Amérique du Nord",
    riskLevel: "safe",
    plug: "Type A / B (fiches plates, 110V)",
    currency: "Dollar Canadien (CAD)",
    docs: [
      "Passeport valide",
      "Autorisation AVE (eTA) obligatoire par avion",
      "Assurance santé / rapatriement"
    ],
    accessories: [
      "Adaptateur secteur Type A/B",
      "Spray anti-moustiques / moucherons (parcs en été)"
    ]
  },
  quebec: {
    name: "Québec (Canada)",
    flag: "⚜️",
    region: "Amérique du Nord",
    riskLevel: "safe",
    plug: "Type A / B (fiches plates, 110V)",
    currency: "Dollar Canadien (CAD)",
    docs: [
      "Passeport valide",
      "Autorisation AVE (eTA) obligatoire par avion",
      "Assurance santé / rapatriement"
    ],
    accessories: [
      "Adaptateur secteur Type A/B",
      "Bottes imperméables & couches thermiques (si hiver québécois !)",
      "Répulsif mouches noires / moustiques (été en forêt)"
    ]
  },
  mexique: {
    name: "Mexique",
    flag: "🇲🇽",
    region: "Amérique du Nord",
    riskLevel: "caution",
    riskAlert: "Vigilance recommandée : renseignez-vous sur les zones déconseillées (France Diplomatie), évitez les déplacements nocturnes isolés et ne buvez jamais l'eau du robinet.",
    plug: "Type A / B (fiches plates, 110V)",
    currency: "Peso Mexicain (MXN)",
    docs: [
      "Passeport valide > 6 mois",
      "Assurance santé / rapatriement",
      "Vaccins recommandés : Hépatite A, Typhoïde"
    ],
    accessories: [
      "Adaptateur secteur Type A/B",
      "Crème solaire biodégradable (obligatoire dans les cénotes)",
      "Répulsif moustiques tropical + pastilles purification / gourde filtrante"
    ]
  },

  // === AMÉRIQUE DU SUD ===
  bresil: {
    name: "Brésil",
    flag: "🇧🇷",
    region: "Amérique du Sud",
    riskLevel: "caution",
    riskAlert: "Vigilance sécurité urbaine : évitez d'exhiber téléphone, montre ou appareil photo dans la rue (Rio/São Paulo). Vaccin fièvre jaune recommandé selon les régions.",
    plug: "Type N (fiches françaises 2 broches souvent compatibles)",
    currency: "Réal Brésilien (BRL)",
    docs: [
      "Passeport valide > 6 mois",
      "Vaccin Fièvre Jaune (recommandé selon zones) + Hépatite A",
      "Assurance santé / rapatriement"
    ],
    accessories: [
      "Adaptateur Type N",
      "Pochette antivol discrète sous les vêtements",
      "Répulsif moustiques tropical"
    ]
  },
  chili: {
    name: "Chili",
    flag: "🇨🇱",
    region: "Amérique du Sud",
    riskLevel: "safe",
    plug: "Type C / L (compatible France pour 2 broches)",
    currency: "Peso Chilien (CLP)",
    docs: [
      "Passeport valide > 6 mois",
      "Assurance santé / rapatriement"
    ],
    accessories: [
      "Adaptateur Type L",
      "Lunettes de soleil haute protection + baume à lèvres SPF (Atacama / Patagonie)",
      "Coupe-vent technique (Patagonie)"
    ]
  },
  perou: {
    name: "Pérou",
    flag: "🇵🇪",
    region: "Amérique du Sud",
    riskLevel: "caution",
    riskAlert: "Vigilance altitude & sécurité : mal des montagnes fréquent à Cusco/lac Titicaca (> 3400m) et prudence dans les transports/quartiers isolés.",
    plug: "Type A / C",
    currency: "Sol Péruvien (PEN)",
    docs: [
      "Passeport valide > 6 mois",
      "Vaccin Fièvre Jaune (si Amazonie) + Hépatite A",
      "Assurance santé incluant secours en altitude"
    ],
    accessories: [
      "Adaptateur Type A/C",
      "Pastilles / traitement mal des montagnes (sur avis médical)",
      "Système multicouches (nuits très froides en altitude, journées ensoleillées)"
    ]
  },

  // === AFRIQUE ===
  maroc: {
    name: "Maroc",
    flag: "🇲🇦",
    region: "Afrique",
    riskLevel: "caution",
    riskAlert: "Vigilance sanitaire & courante : privilégiez l'eau en bouteille capsulée, prudence dans les médinas la nuit et en randonnée montagne (guide recommandé).",
    plug: "Type C / E (identique France)",
    currency: "Dirham Marocain (MAD)",
    docs: [
      "Passeport valide (couvrant toute la durée du séjour ; CNI non acceptée)",
      "Assurance rapatriement"
    ],
    accessories: [
      "Tenue légère couvrante (respect des usages locaux)",
      "Écharpe / chèche (poussière, vent ou soleil)",
      "Pharmacie troubles digestifs"
    ]
  },
  tanzanie: {
    name: "Tanzanie",
    flag: "🇹🇿",
    region: "Afrique",
    riskLevel: "caution",
    riskAlert: "Vigilance sanitaire & sécurité : traitement antipaludéen indispensable, vaccin fièvre jaune selon provenance, et eau en bouteille uniquement.",
    plug: "Type G (3 broches rectangulaires UK)",
    currency: "Shilling Tanzanien (TZS) + Dollars USD récents",
    docs: [
      "Passeport valide > 6 mois",
      "e-Visa Tanzanie",
      "Carnet de vaccination international (Fièvre Jaune, Hépatite A, traitement Paludisme)"
    ],
    accessories: [
      "Adaptateur Type G",
      "Jumelles compactes (safari)",
      "Vêtements couleurs neutres (kaki/beige — éviter le bleu/noir pour les mouches tsé-tsé)",
      "Répulsif moustiques DEET 50%"
    ]
  },
  afrique_sud: {
    name: "Afrique du Sud",
    flag: "🇿🇦",
    region: "Afrique",
    riskLevel: "caution",
    riskAlert: "Vigilance sécurité élevée : ne marchez pas seul la nuit en ville, verrouillez les portières en voiture et évitez d'exhiber des objets de valeur. Coupures de courant (loadshedding) fréquentes.",
    plug: "Type M (3 grosses broches rondes spécifiques !)",
    currency: "Rand Sud-Africain (ZAR)",
    docs: [
      "Passeport valide > 30j après retour (avec 2 pages vierges)",
      "Assurance santé / rapatriement",
      "Permis international (si location voiture)"
    ],
    accessories: [
      "Adaptateur spécifique Type M (indispensable, introuvable dans les kits classiques)",
      "Lampe torche / frontale + batterie externe (coupures électriques fréquentes)",
      "Répulsif moustiques (si région Kruger)"
    ]
  },
  egypte: {
    name: "Égypte",
    flag: "🇪🇬",
    region: "Afrique",
    riskLevel: "caution",
    riskAlert: "Vigilance sécurité & sanitaire : suivez les zones autorisées (France Diplomatie), buvez exclusivement de l'eau en bouteille et prévoyez une trousse anti-tourista.",
    plug: "Type C / F (compatible France)",
    currency: "Livre Égyptienne (EGP)",
    docs: [
      "Passeport valide > 6 mois",
      "Visa (e-Visa ou à l'arrivée)",
      "Vaccin Hépatite A recommandé"
    ],
    accessories: [
      "Bâtons / chapeau + protection solaire maximale",
      "Trousse digestive complète",
      "Petites coupures pour bakchich / pourboires"
    ]
  }
};

// Modèles complets de checklists prédéfinis
const DEFAULT_TEMPLATES = [
  {
    id: "tpl_japon_long",
    name: "Grand Voyage Japon (Avion - Mi-saison)",
    countryKey: "japon",
    tripType: "long",
    season: "misaison",
    transport: "avion",
    activities: ["photo", "culture"],
    party: { adultsMen: 1, adultsWomen: 1, teensBoys: 0, teensGirls: 0, childrenBoys: 0, childrenGirls: 0, babies: 0, pets: { enabled: false, type: "chien", takesPet: true } }
  },
  {
    id: "tpl_famille_plage",
    name: "Vacances Famille & Chien (Voiture - Été)",
    countryKey: "france",
    tripType: "plage",
    season: "ete",
    transport: "voiture",
    activities: ["plage", "lecture", "jeux"],
    party: { adultsMen: 1, adultsWomen: 1, teensBoys: 0, teensGirls: 0, childrenBoys: 1, childrenGirls: 0, babies: 1, pets: { enabled: true, type: "chien", takesPet: true } }
  },
  {
    id: "tpl_weekend_city",
    name: "City-trip Londres (Avion - Week-end)",
    countryKey: "angleterre",
    tripType: "weekend",
    season: "misaison",
    transport: "avion",
    activities: ["culture", "soiree"],
    party: { adultsMen: 1, adultsWomen: 1, teensBoys: 0, teensGirls: 0, childrenBoys: 0, childrenGirls: 0, babies: 0, pets: { enabled: false, type: "chien", takesPet: true } }
  },
  {
    id: "tpl_bivouac_ete",
    name: "Bivouac & Randonnée (Train - Été)",
    countryKey: "france",
    tripType: "bivouac",
    season: "ete",
    transport: "train",
    activities: ["randonnee", "camping"],
    party: { adultsMen: 1, adultsWomen: 0, teensBoys: 0, teensGirls: 0, childrenBoys: 0, childrenGirls: 0, babies: 0, pets: { enabled: false, type: "chien", takesPet: true } }
  },
  {
    id: "tpl_ski_hiver",
    name: "Séjour Ski Montagne (Voiture - Hiver)",
    countryKey: "france",
    tripType: "ski",
    season: "hiver",
    transport: "voiture",
    activities: ["ski", "soiree"],
    party: { adultsMen: 1, adultsWomen: 1, teensBoys: 1, teensGirls: 0, childrenBoys: 0, childrenGirls: 0, babies: 0, pets: { enabled: false, type: "chien", takesPet: true } }
  }
];

// Groupes de voyageurs pour l'attribution et la vue « Par Personne »
const PERSON_GROUPS = {
  adult: {
    id: 'adult',
    label: 'Adulte',
    shortLabel: 'Adulte',
    color: '#1E4D3B',
    badgeBg: 'rgba(30, 77, 59, 0.12)',
    iconSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
  },
  child: {
    id: 'child',
    label: 'Enfant',
    shortLabel: 'Enfant',
    color: '#D97706',
    badgeBg: 'rgba(217, 119, 6, 0.12)',
    iconSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-1a6 6 0 0 1 12 0v1"/></svg>'
  },
  pet: {
    id: 'pet',
    label: 'Animal',
    shortLabel: 'Animal',
    color: '#059669',
    badgeBg: 'rgba(5, 150, 105, 0.12)',
    iconSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="4" cy="8" r="2"/><circle cx="7" cy="14" r="2"/><path d="M12 14c-3.2 0-5 2.4-5 4.5C7 20 8.5 21 12 21s5-1 5-2.5c0-2.1-1.8-4.5-5-4.5Z"/></svg>'
  },
  shared: {
    id: 'shared',
    label: 'Commun / Partagé',
    shortLabel: 'Commun',
    color: '#475569',
    badgeBg: 'rgba(71, 85, 105, 0.10)',
    iconSvg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
  }
};

// Drapeaux SVG (viewBox 24x18) pour un rendu homogène sous Windows/Linux/macOS/Android
const COUNTRY_FLAG_SVGS = {
  france: '<rect width="8" height="18" fill="#002395"/><rect x="8" width="8" height="18" fill="#FFFFFF"/><rect x="16" width="8" height="18" fill="#ED2939"/>',
  espagne: '<rect width="24" height="18" fill="#AA151B"/><rect y="4.5" width="24" height="9" fill="#F1BF00"/><rect x="5.5" y="7" width="3" height="4" rx="0.6" fill="#AA151B"/>',
  andorre: '<rect width="8" height="18" fill="#0018A8"/><rect x="8" width="8" height="18" fill="#FEDF00"/><rect x="16" width="8" height="18" fill="#D52B1E"/><rect x="10.2" y="7" width="3.6" height="4" rx="0.5" fill="#9E2A2B"/>',
  croatie: '<rect width="24" height="6" fill="#FF0000"/><rect y="6" width="24" height="6" fill="#FFFFFF"/><rect y="12" width="24" height="6" fill="#171796"/><rect x="9.5" y="6" width="5" height="6" rx="0.8" fill="#FF0000"/><rect x="11.2" y="7.5" width="1.6" height="1.6" fill="#FFFFFF"/><rect x="11.2" y="10.2" width="1.6" height="1.6" fill="#FFFFFF"/>',
  pologne: '<rect width="24" height="9" fill="#FFFFFF"/><rect y="9" width="24" height="9" fill="#DC143C"/>',
  allemagne: '<rect width="24" height="6" fill="#000000"/><rect y="6" width="24" height="6" fill="#DD0000"/><rect y="12" width="24" height="6" fill="#FFCE00"/>',
  irlande: '<rect width="8" height="18" fill="#169B62"/><rect x="8" width="8" height="18" fill="#FFFFFF"/><rect x="16" width="8" height="18" fill="#FF883E"/>',
  angleterre: '<rect width="24" height="18" fill="#012169"/><path d="M0 0L24 18M24 0L0 18" stroke="#FFFFFF" stroke-width="3.2"/><path d="M0 0L24 18M24 0L0 18" stroke="#C8102E" stroke-width="1.4"/><path d="M12 0V18M0 9H24" stroke="#FFFFFF" stroke-width="5"/><path d="M12 0V18M0 9H24" stroke="#C8102E" stroke-width="3"/>',
  italie: '<rect width="8" height="18" fill="#009246"/><rect x="8" width="8" height="18" fill="#FFFFFF"/><rect x="16" width="8" height="18" fill="#CE2B37"/>',
  portugal: '<rect width="9.5" height="18" fill="#006600"/><rect x="9.5" width="14.5" height="18" fill="#FF0000"/><circle cx="9.5" cy="9" r="3.4" fill="#FFCC00"/><circle cx="9.5" cy="9" r="2.1" fill="#FFFFFF" stroke="#003399" stroke-width="0.7"/>',
  grece: '<rect width="24" height="18" fill="#0D5EAF"/><rect y="2" width="24" height="2" fill="#FFFFFF"/><rect y="6" width="24" height="2" fill="#FFFFFF"/><rect y="10" width="24" height="2" fill="#FFFFFF"/><rect y="14" width="24" height="2" fill="#FFFFFF"/><rect width="10" height="10" fill="#0D5EAF"/><rect x="4" width="2" height="10" fill="#FFFFFF"/><rect y="4" width="10" height="2" fill="#FFFFFF"/>',
  suisse: '<rect width="24" height="18" fill="#D52B1E"/><rect x="10.2" y="3.6" width="3.6" height="10.8" fill="#FFFFFF"/><rect x="6.6" y="7.2" width="10.8" height="3.6" fill="#FFFFFF"/>',
  norvege: '<rect width="24" height="18" fill="#BA0C2F"/><path d="M8.5 0V18M0 9H24" stroke="#FFFFFF" stroke-width="4.2"/><path d="M8.5 0V18M0 9H24" stroke="#00205B" stroke-width="2.2"/>',
  islande: '<rect width="24" height="18" fill="#02529C"/><path d="M8.5 0V18M0 9H24" stroke="#FFFFFF" stroke-width="4.2"/><path d="M8.5 0V18M0 9H24" stroke="#DC1E35" stroke-width="2.2"/>',
  laponie: '<rect width="24" height="18" fill="#FFFFFF"/><path d="M8.5 0V18M0 9H24" stroke="#003580" stroke-width="3.6"/>',
  japon: '<rect width="24" height="18" fill="#FFFFFF"/><circle cx="12" cy="9" r="4.8" fill="#BC002D"/>',
  thailande: '<rect width="24" height="18" fill="#A51931"/><rect y="3" width="24" height="12" fill="#F4F5F8"/><rect y="6" width="24" height="6" fill="#2D2A4A"/>',
  chine: '<rect width="24" height="18" fill="#DE2910"/><polygon points="5,3.2 5.6,5 7.4,5 5.9,6 6.5,7.8 5,6.7 3.5,7.8 4.1,6 2.6,5 4.4,5" fill="#FFDE00"/><circle cx="9.2" cy="2.8" r="0.6" fill="#FFDE00"/><circle cx="10.4" cy="4.4" r="0.6" fill="#FFDE00"/><circle cx="10.4" cy="6.6" r="0.6" fill="#FFDE00"/><circle cx="9.2" cy="8.2" r="0.6" fill="#FFDE00"/>',
  bali: '<rect width="24" height="9" fill="#CE1126"/><rect y="9" width="24" height="9" fill="#FFFFFF"/>',
  vietnam: '<rect width="24" height="18" fill="#DA251D"/><polygon points="12,4.2 13.1,7.5 16.5,7.5 13.8,9.5 14.8,12.8 12,10.8 9.2,12.8 10.2,9.5 7.5,7.5 10.9,7.5" fill="#FFFF00"/>',
  coree: '<rect width="24" height="18" fill="#FFFFFF"/><path d="M12 4.8A4.2 4.2 0 0 1 12 13.2A2.1 2.1 0 0 1 12 9A2.1 2.1 0 0 0 12 4.8Z" fill="#CD2E3A"/><path d="M12 13.2A4.2 4.2 0 0 1 12 4.8A2.1 2.1 0 0 1 12 9A2.1 2.1 0 0 0 12 13.2Z" fill="#0047A0"/><path d="M5 4L6.8 2.2M5.7 4.7L7.5 2.9M6.4 5.4L8.2 3.6M15.8 14.4L17.6 12.6M16.5 15.1L18.3 13.3M17.2 15.8L19 14" stroke="#111827" stroke-width="0.9" stroke-linecap="round"/>',
  usa: '<rect width="24" height="18" fill="#FFFFFF"/><rect width="24" height="2.6" fill="#B22234"/><rect y="5.1" width="24" height="2.6" fill="#B22234"/><rect y="10.2" width="24" height="2.6" fill="#B22234"/><rect y="15.4" width="24" height="2.6" fill="#B22234"/><rect width="10.5" height="9.6" fill="#3C3B6E"/><circle cx="2.5" cy="2.5" r="0.6" fill="#FFFFFF"/><circle cx="5.2" cy="2.5" r="0.6" fill="#FFFFFF"/><circle cx="8" cy="2.5" r="0.6" fill="#FFFFFF"/><circle cx="3.8" cy="4.8" r="0.6" fill="#FFFFFF"/><circle cx="6.6" cy="4.8" r="0.6" fill="#FFFFFF"/><circle cx="2.5" cy="7.1" r="0.6" fill="#FFFFFF"/><circle cx="5.2" cy="7.1" r="0.6" fill="#FFFFFF"/><circle cx="8" cy="7.1" r="0.6" fill="#FFFFFF"/>',
  canada: '<rect width="6" height="18" fill="#FF0000"/><rect x="6" width="12" height="18" fill="#FFFFFF"/><rect x="18" width="6" height="18" fill="#FF0000"/><path d="M12 4.2L13 7L15 6.3L14.1 8.8L15.8 9.6L14.5 10.6L14.8 11.8L12.5 11.4V13.8H11.5V11.4L9.2 11.8L9.5 10.6L8.2 9.6L9.9 8.8L9 6.3L11 7Z" fill="#FF0000"/>',
  quebec: '<rect width="24" height="18" fill="#003DA5"/><path d="M12 0V18M0 9H24" stroke="#FFFFFF" stroke-width="3"/><circle cx="5" cy="4.2" r="1.4" fill="#FFFFFF"/><circle cx="19" cy="4.2" r="1.4" fill="#FFFFFF"/><circle cx="5" cy="13.8" r="1.4" fill="#FFFFFF"/><circle cx="19" cy="13.8" r="1.4" fill="#FFFFFF"/>',
  mexique: '<rect width="8" height="18" fill="#006847"/><rect x="8" width="8" height="18" fill="#FFFFFF"/><rect x="16" width="8" height="18" fill="#CE1126"/><circle cx="12" cy="9" r="2.1" fill="#8B5A2B"/>',
  bresil: '<rect width="24" height="18" fill="#009C3B"/><polygon points="12,2.2 21.5,9 12,15.8 2.5,9" fill="#FFDF00"/><circle cx="12" cy="9" r="3.4" fill="#002776"/><path d="M8.8 8.6Q12 7.4 15.2 9.4" stroke="#FFFFFF" stroke-width="0.9" fill="none"/>',
  chili: '<rect width="24" height="9" fill="#FFFFFF"/><rect y="9" width="24" height="9" fill="#D52B1E"/><rect width="9" height="9" fill="#0039A6"/><polygon points="4.5,2.3 5.1,4.1 6.9,4.1 5.4,5.1 6,6.9 4.5,5.8 3,6.9 3.6,5.1 2.1,4.1 3.9,4.1" fill="#FFFFFF"/>',
  perou: '<rect width="8" height="18" fill="#D91023"/><rect x="8" width="8" height="18" fill="#FFFFFF"/><rect x="16" width="8" height="18" fill="#D91023"/>',
  maroc: '<rect width="24" height="18" fill="#C1272D"/><polygon points="12,4.8 13,7.9 16.2,7.9 13.6,9.8 14.6,12.8 12,11 9.4,12.8 10.4,9.8 7.8,7.9 11,7.9" fill="none" stroke="#006233" stroke-width="1.2"/>',
  tanzanie: '<rect width="24" height="18" fill="#1EB53A"/><polygon points="24,0 24,18 0,18" fill="#00A3DD"/><path d="M0 18L24 0" stroke="#FCD116" stroke-width="6.2"/><path d="M0 18L24 0" stroke="#000000" stroke-width="4.2"/>',
  afrique_sud: '<rect width="24" height="6" fill="#E03C31"/><rect y="12" width="24" height="6" fill="#001489"/><rect y="6" width="24" height="6" fill="#FFFFFF"/><polygon points="0,0 10,9 0,18" fill="#000000"/><path d="M0 0L11 9L0 18M11 9H24" stroke="#007749" stroke-width="4.5" fill="none"/><path d="M0 1.8L8.5 9L0 16.2" stroke="#FFB81C" stroke-width="1.3" fill="none"/>',
  egypte: '<rect width="24" height="6" fill="#CE1126"/><rect y="6" width="24" height="6" fill="#FFFFFF"/><rect y="12" width="24" height="6" fill="#000000"/><circle cx="12" cy="9" r="1.6" fill="#C09300"/>'
};

function getCountryFlagSvg(countryKey, className = '') {
  const inner = COUNTRY_FLAG_SVGS[countryKey] || COUNTRY_FLAG_SVGS.france;
  const cls = className ? `country-flag-svg ${className}` : 'country-flag-svg';
  const label = (typeof COUNTRIES !== 'undefined' && COUNTRIES[countryKey]?.name) ? COUNTRIES[countryKey].name : 'Drapeau';
  return `<svg class="${cls}" viewBox="0 0 24 18" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}
