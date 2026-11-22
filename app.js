// Valise — Checklist Voyage Moderne (2026)
(() => {
  'use strict';

  const CURRENT_APP_VERSION = '1.2.0';
  const GITHUB_REPO = 'QuentinV1/checklist-valise';
  const STORAGE_KEY = 'valise_app_data_v4';
  const LAST_UID_KEY = 'valise_last_uid';
  const LEGACY_STORAGE_KEY_V3 = 'valise_app_data_v3';
  const LEGACY_STORAGE_KEY_V2 = 'valise_app_data_v2';
  const THEME_KEY = 'valise_theme';
  const UPDATE_DISMISSED_KEY = 'valise_update_dismissed';

  const SVG_CLOUD = `<svg class="btn-svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;
  const SVG_USER = `<svg class="btn-svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const SVG_CHECK = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const SVG_EDIT = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`;
  const SVG_TRASH = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;
  const SVG_COPY = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const SVG_CHECK_ALL = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>`;
  const COLLAPSE_CHEVRON_SVG = `<svg class="collapse-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;

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

  // État temporaire du formulaire de voyage
  let currentParty = createDefaultParty();
  let selectedActivities = new Set();
  let selectedCountryKey = 'france';
  let selectedTransport = 'avion';
  let selectedSeason = 'misaison';
  let selectedTripType = 'weekend';
  let selectedDays = 3;
  let selectedLaundry = false;
  let currentRegionFilter = 'all';
  let confirmCallback = null;
  let latestReleaseData = null;

  const cloudState = {
    initialSyncDone: false,
    syncedCols: {},
    syncStatus: 'idle', // 'idle' | 'syncing' | 'synced' | 'error'
    syncError: null,
    lastSyncedAt: null
  };

  function reinitialiserEtatCloud() {
    cloudState.initialSyncDone = false;
    cloudState.syncedCols = {};
    cloudState.syncStatus = 'idle';
    cloudState.syncError = null;
    cloudState.lastSyncedAt = null;
  }

  let _suppressCloudSync = false;
  let _syncTimer = null;

  function createDefaultParty() {
    return {
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
  }

  // === UTILITAIRES & VALIDATION ===
  function formatWeightKg(grams, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return (Math.round((((Number(grams) || 0) / 1000) + Number.EPSILON) * factor) / factor).toFixed(decimals);
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  function sanitizeId(id, prefix = 'id') {
    const cleaned = String(id ?? '').replace(/[^a-zA-Z0-9_:-]/g, '');
    return cleaned || `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }

  function sanitizeText(val, maxLen = 200) {
    return String(val ?? '').trim().slice(0, maxLen);
  }

  function sanitizeDateStr(val) {
    const str = String(val ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return '';
    const [y, m, d] = str.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return '';
    return str;
  }

  function isNativeAndroidApp() {
    return Boolean(
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform()
    );
  }

  function isTrustedUpdateUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return false;
      const host = parsed.hostname.toLowerCase();
      if (host === 'github.com' || host === 'raw.githubusercontent.com') {
        return parsed.pathname.toLowerCase().startsWith(`/${GITHUB_REPO.toLowerCase()}/`);
      }
      return host === 'objects.githubusercontent.com' || host === 'release-assets.githubusercontent.com';
    } catch {
      return false;
    }
  }

  // === NORMALISATION RETROCOMPATIBLE ===
  function normalizeParty(party = {}) {
    let adultsMen = Number(party.adultsMen);
    let adultsWomen = Number(party.adultsWomen);
    if (Number.isNaN(adultsMen) && Number.isNaN(adultsWomen)) {
      const oldAdults = Number(party.adults) || 1;
      adultsMen = Math.max(1, Math.ceil(oldAdults / 2));
      adultsWomen = Math.max(0, Math.floor(oldAdults / 2));
    } else {
      adultsMen = Math.max(0, Number.isNaN(adultsMen) ? 1 : Math.round(adultsMen));
      adultsWomen = Math.max(0, Number.isNaN(adultsWomen) ? 0 : Math.round(adultsWomen));
      if (adultsMen === 0 && adultsWomen === 0) adultsMen = 1;
    }

    let teensBoys = Number(party.teensBoys);
    let teensGirls = Number(party.teensGirls);
    if (Number.isNaN(teensBoys) && Number.isNaN(teensGirls)) {
      const oldTeens = Number(party.teens) || 0;
      teensBoys = Math.ceil(oldTeens / 2);
      teensGirls = Math.floor(oldTeens / 2);
    } else {
      teensBoys = Math.max(0, Number.isNaN(teensBoys) ? 0 : Math.round(teensBoys));
      teensGirls = Math.max(0, Number.isNaN(teensGirls) ? 0 : Math.round(teensGirls));
    }

    let childrenBoys = Number(party.childrenBoys);
    let childrenGirls = Number(party.childrenGirls);
    if (Number.isNaN(childrenBoys) && Number.isNaN(childrenGirls)) {
      const oldChildren = Number(party.children) || 0;
      childrenBoys = Math.ceil(oldChildren / 2);
      childrenGirls = Math.floor(oldChildren / 2);
    } else {
      childrenBoys = Math.max(0, Number.isNaN(childrenBoys) ? 0 : Math.round(childrenBoys));
      childrenGirls = Math.max(0, Number.isNaN(childrenGirls) ? 0 : Math.round(childrenGirls));
    }

    const babies = Math.max(0, Math.round(Number(party.babies) || 0));

    const rawPets = party.pets || {};
    const enabled = Boolean(rawPets.enabled);
    let dogs = 0;
    let cats = 0;
    let others = 0;

    if (rawPets.dogs !== undefined || rawPets.cats !== undefined || rawPets.others !== undefined) {
      dogs = Math.max(0, Math.round(Number(rawPets.dogs) || 0));
      cats = Math.max(0, Math.round(Number(rawPets.cats) || 0));
      others = Math.max(0, Math.round(Number(rawPets.others) || 0));
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

  function formatPartySummary(party, options = {}) {
    const p = normalizeParty(party);
    const petModeStyle = options.petMode || 'short'; // 'short' ('voyage'/'garde') | 'verbose' ('emmené'/'gardé')
    const tokens = [];
    const adultTokens = [];
    if (p.adultsMen > 0) adultTokens.push(`${p.adultsMen}H`);
    if (p.adultsWomen > 0) adultTokens.push(`${p.adultsWomen}F`);
    if (adultTokens.length > 0) tokens.push(adultTokens.join('/'));

    const teenTokens = [];
    if (p.teensBoys > 0) teenTokens.push(`${p.teensBoys} ado G.`);
    if (p.teensGirls > 0) teenTokens.push(`${p.teensGirls} ado F.`);
    if (teenTokens.length > 0) tokens.push(teenTokens.join(', '));

    const childTokens = [];
    if (p.childrenBoys > 0) childTokens.push(`${p.childrenBoys} garç.`);
    if (p.childrenGirls > 0) childTokens.push(`${p.childrenGirls} fille${p.childrenGirls > 1 ? 's' : ''}`);
    if (childTokens.length > 0) tokens.push(childTokens.join(', '));

    if (p.babies > 0) tokens.push(`${p.babies} bébé${p.babies > 1 ? 's' : ''}`);

    const petsSummary = formatPetsSummary(p.pets);
    if (petsSummary) {
      if (petModeStyle === 'verbose') {
        const plural = getTotalPets(p.pets) > 1 ? 's' : '';
        tokens.push(`${petsSummary} (${p.pets.takesPet ? 'emmené' : 'gardé'}${plural})`);
      } else {
        tokens.push(`${petsSummary} (${p.pets.takesPet ? 'voyage' : 'garde'})`);
      }
    }

    if (tokens.length > 0) return tokens.join(' · ');
    const peopleCount = p.adultsMen + p.adultsWomen + p.teensBoys + p.teensGirls + p.childrenBoys + p.childrenGirls + p.babies;
    return `${peopleCount} voyageur${peopleCount > 1 ? 's' : ''}`;
  }

  function sanitizeBaggages(rawBags, transportKey) {
    const fallback = JSON.parse(JSON.stringify((TRANSPORTS[transportKey] || TRANSPORTS.avion).baggages));
    if (!rawBags || typeof rawBags !== 'object' || Array.isArray(rawBags)) return fallback;

    const clean = {};
    for (const [key, bag] of Object.entries(rawBags)) {
      const safeKey = sanitizeId(key, 'bag');
      if (safeKey === 'porte' || !bag || typeof bag !== 'object') continue;
      clean[safeKey] = {
        name: sanitizeText(bag.name, 60) || safeKey,
        limit: Math.max(500, Math.min(200000, Math.round(Number(bag.limit) || 10000)))
      };
    }
    return Object.keys(clean).length > 0 ? clean : fallback;
  }

  function inferLegacyPhase(rawItem) {
    if (rawItem.cat === 'house') return 'phase_departure';
    if (rawItem.cat === 'souvenirs') return 'phase_return';
    const lower = String(rawItem.name || '').toLowerCase();
    if (
      rawItem.cat === 'admin' &&
      (lower.includes('passeport') || lower.includes('visa') || lower.includes('vaccin') || lower.includes('assurance'))
    ) {
      return 'phase_6months';
    }
    return 'phase_pack';
  }

  function getDefaultBaggageKey(baggages) {
    if (baggages.daypack) return 'daypack';
    if (baggages.cabine) return 'cabine';
    return Object.keys(baggages)[0] || 'porte';
  }

  function inferLegacyPerson(raw) {
    if (typeof PERSON_GROUPS !== 'undefined' && PERSON_GROUPS[raw?.person]) return raw.person;
    if (raw?.cat === 'pet') return 'pet';
    if (raw?.cat === 'baby') return 'child';
    return 'shared';
  }

  function sanitizeItem(raw, baggages, usedIds) {
    if (!raw || typeof raw !== 'object') return null;
    const name = sanitizeText(raw.name, 160);
    if (!name) return null;

    let id = sanitizeId(raw.id, 'it');
    while (usedIds.has(id)) {
      id = `${id}_${Math.floor(Math.random() * 1000)}`;
    }
    usedIds.add(id);

    const cat = CATEGORIES[raw.cat] ? raw.cat : 'practical';
    const phase = CHRONO_PHASES[raw.phase] ? raw.phase : inferLegacyPhase(raw);
    const rawBag = String(raw.baggage || '');
    const baggage = (rawBag === 'porte' || baggages[rawBag]) ? rawBag : getDefaultBaggageKey(baggages);

    return {
      id,
      name,
      note: sanitizeText(raw.note, 160),
      cat,
      baggage,
      qty: Math.max(1, Math.min(999, Math.round(Number(raw.qty) || 1))),
      weight: Math.max(0, Math.min(100000, Math.round(Number(raw.weight) || 0))),
      iata: (raw.iata === 'cabin-only' || raw.iata === 'hold-only') ? raw.iata : '',
      phase,
      person: inferLegacyPerson(raw),
      custom: Boolean(raw.custom || String(raw.id || '').startsWith('custom_')),
      checked: Boolean(raw.checked)
    };
  }

  function sanitizeTrip(raw, usedTripIds = new Set()) {
    if (!raw || typeof raw !== 'object') return null;
    const countryKey = COUNTRIES[raw.countryKey] ? raw.countryKey : 'france';
    const tripType = TRIP_TYPES[raw.tripType] ? raw.tripType : 'weekend';
    const season = SEASONS[raw.season] ? raw.season : 'misaison';
    const transport = TRANSPORTS[raw.transport] ? raw.transport : 'avion';
    const baggages = sanitizeBaggages(raw.baggages, transport);
    const usedItemIds = new Set();

    let id = sanitizeId(raw.id, 'trip');
    while (usedTripIds.has(id)) {
      id = `${id}_${Math.floor(Math.random() * 1000)}`;
    }
    usedTripIds.add(id);

    const items = Array.isArray(raw.items)
      ? raw.items.map(it => sanitizeItem(it, baggages, usedItemIds)).filter(Boolean)
      : [];

    const activities = Array.isArray(raw.activities)
      ? Array.from(new Set(raw.activities.filter(a => Boolean(ACTIVITIES[a]))))
      : [];

    return {
      id,
      name: sanitizeText(raw.name, 100) || (COUNTRIES[countryKey]?.name || 'Mon Voyage'),
      countryKey,
      tripType,
      days: Math.max(1, Math.min(365, Math.round(Number(raw.days) || TRIP_TYPES[tripType].duration || 3))),
      departureDate: sanitizeDateStr(raw.departureDate),
      laundry: Boolean(raw.laundry),
      season,
      transport,
      party: normalizeParty(raw.party),
      activities,
      baggages,
      items
    };
  }

  function sanitizeTemplate(raw, usedTplIds = new Set()) {
    if (!raw || typeof raw !== 'object') return null;
    const countryKey = COUNTRIES[raw.countryKey] ? raw.countryKey : 'france';
    const tripType = TRIP_TYPES[raw.tripType] ? raw.tripType : 'weekend';
    const season = SEASONS[raw.season] ? raw.season : 'misaison';
    const transport = TRANSPORTS[raw.transport] ? raw.transport : 'avion';
    const baggages = sanitizeBaggages(raw.baggages, transport);
    const usedItemIds = new Set();

    let id = sanitizeId(raw.id, 'ctpl');
    while (usedTplIds.has(id)) {
      id = `${id}_${Math.floor(Math.random() * 1000)}`;
    }
    usedTplIds.add(id);

    const items = Array.isArray(raw.items)
      ? raw.items.map(it => sanitizeItem({ ...it, checked: false }, baggages, usedItemIds)).filter(Boolean)
      : [];

    return {
      id,
      name: sanitizeText(raw.name, 100) || 'Modèle sans nom',
      countryKey,
      tripType,
      days: Math.max(1, Math.min(365, Math.round(Number(raw.days) || TRIP_TYPES[tripType].duration || 3))),
      laundry: Boolean(raw.laundry),
      season,
      transport,
      party: normalizeParty(raw.party),
      activities: Array.isArray(raw.activities) ? raw.activities.filter(a => Boolean(ACTIVITIES[a])) : [],
      baggages,
      items
    };
  }

  function sanitizeImportedState(rawData) {
    if (!rawData || typeof rawData !== 'object' || !Array.isArray(rawData.trips)) {
      return null;
    }

    const usedTripIds = new Set();
    const trips = rawData.trips.map(t => sanitizeTrip(t, usedTripIds)).filter(Boolean);

    const usedTplIds = new Set();
    const customTemplates = Array.isArray(rawData.customTemplates)
      ? rawData.customTemplates.map(tpl => sanitizeTemplate(tpl, usedTplIds)).filter(Boolean)
      : [];

    const activeTripId = trips.some(t => t.id === rawData.activeTripId)
      ? rawData.activeTripId
      : (trips[0]?.id || null);

    const viewMode = ['chrono', 'baggage', 'category', 'person'].includes(rawData.viewMode) ? rawData.viewMode : 'chrono';
    const filterPhase = rawData.filterPhase === 'all' || CHRONO_PHASES[rawData.filterPhase] ? rawData.filterPhase : 'all';
    const filterStatus = ['all', 'todo', 'done'].includes(rawData.filterStatus) ? rawData.filterStatus : 'all';
    const filterBaggage = typeof rawData.filterBaggage === 'string' && rawData.filterBaggage
      ? sanitizeId(rawData.filterBaggage, 'all')
      : 'all';

    const collapsedSections = {};
    if (rawData.collapsedSections && typeof rawData.collapsedSections === 'object' && !Array.isArray(rawData.collapsedSections)) {
      for (const [k, v] of Object.entries(rawData.collapsedSections)) {
        if (v === true && typeof k === 'string' && /^[a-z]+:[a-zA-Z0-9_:-]+$/.test(k)) {
          collapsedSections[k] = true;
        }
      }
    }

    return {
      trips,
      activeTripId,
      customTemplates,
      viewMode,
      filterPhase,
      filterBaggage,
      filterStatus,
      searchQuery: '',
      collapsedSections
    };
  }

  // === GÉNÉRATEUR INTELLIGENT DE CHECKLIST (CHRONOLOGIQUE & MULTI-PROFILS) ===
  function generateChecklist({ countryKey, tripType, season, transport, activities = [], party = currentParty, days, laundry = false }) {
    const country = COUNTRIES[countryKey] || COUNTRIES.france;
    const tType = TRIP_TYPES[tripType] || TRIP_TYPES.weekend;
    const tripDays = Math.max(1, Math.min(365, Math.round(Number(days) || tType.duration || 3)));
    const laundryEnabled = Boolean(laundry);
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

    const inferGeneratedPerson = (name, cat, explicitPerson) => {
      if (explicitPerson && typeof PERSON_GROUPS !== 'undefined' && PERSON_GROUPS[explicitPerson]) {
        return explicitPerson;
      }
      if (cat === 'pet') return 'pet';
      if (cat === 'baby') return 'child';
      if (/ado|enfant|bébé|garçon|fille/i.test(name)) return 'child';
      if (cat === 'clothes') return 'adult';
      if (cat === 'hygiene' && /brosse à dents|déodorant|rasoir|protections|maquillage|épiler|coupe-ongles|crème hydratante|après-rasage/i.test(name)) return 'adult';
      if (cat === 'health' && /pilule/i.test(name)) return 'adult';
      return 'shared';
    };

    const add = (name, cat, bag, qty = 1, weight = 0, iata = '', phase = 'phase_pack', note = '', person = '') => {
      const norm = name.toLowerCase().trim();
      if (seenNames.has(norm)) return;
      seenNames.add(norm);
      items.push({
        id: `it_${Date.now()}_${uid++}`,
        name,
        note,
        cat,
        baggage: pickBag(bag),
        qty,
        weight,
        iata: isPlane ? iata : '',
        phase,
        person: inferGeneratedPerson(name, cat, person),
        custom: false,
        checked: false
      });
    };

    // Plafond vêtements réaliste (8j avec lessive, 14j sans lessive)
    const q = Math.min(laundryEnabled ? 8 : 14, tripDays);
    const needsAdapter = !country.plug.includes('identique France')
      && !country.plug.includes('standard français')
      && !country.plug.includes('compatible France');

    // =========================================================
    // 1. PHASE : EN AMONT (≥ 6 MOIS)
    // =========================================================
    add('Vérification validité des Passeports (> 6 mois après retour) et CNI', 'admin', 'daypack', Math.max(1, totalPeople), 30, 'cabin-only', 'phase_6months');

    country.docs.forEach(docName => {
      add(docName, 'admin', 'daypack', 1, 30, 'cabin-only', 'phase_6months');
    });

    if (country.region === 'Europe' && country.name !== 'France (Métropole / Corse)') {
      add("Commander la Carte Européenne d'Assurance Maladie (CEAM)", 'admin', 'daypack', Math.max(1, totalPeople), 10, 'cabin-only', 'phase_6months');
    }

    add('Souscription / Vérification assurance voyage, assistance & rapatriement', 'admin', 'daypack', 1, 10, 'cabin-only', 'phase_6months');
    add("Réservation des billets d'avion / train / traversées", 'admin', 'daypack', 1, 10, 'cabin-only', 'phase_6months');
    add('Réservation des hébergements & vérification des conditions', 'admin', 'daypack', 1, 10, 'cabin-only', 'phase_6months');

    if (p.babies > 0) {
      add("Livret de famille + Pièce d'identité / Passeport bébé", 'baby', 'daypack', p.babies, 30, 'cabin-only', 'phase_6months');
      add('Vérifier disponibilité lit parapluie & chaise haute sur le lieu de séjour', 'baby', 'daypack', 1, 0, '', 'phase_6months');
    }

    if (totalChildren > 0 || totalTeens > 0) {
      add('Vérifier validité CNI / Passeports des mineurs & autorisations requises', 'baby', 'daypack', totalChildren + totalTeens, 30, 'cabin-only', 'phase_6months');
    }

    const totalPets = getTotalPets(p.pets);
    const petsDesc = formatPetsSummary(p.pets);

    if (totalPets > 0) {
      if (p.pets.takesPet) {
        const petDocLabel = country.region === 'Europe'
          ? 'Passeport européen'
          : 'Certificat sanitaire international / Passeport animal';
        add(`${petDocLabel} (${petsDesc}) + Vaccin rage à jour + Puce électronique`, 'pet', 'daypack', totalPets, 30, 'cabin-only', 'phase_6months');
        add(`Réserver le titre de transport pour ${totalPets > 1 ? 'les animaux' : "l'animal"} (${petsDesc}) (train/avion/ferry)`, 'pet', 'daypack', totalPets, 10, '', 'phase_6months');
        add("Confirmer avec le logement l'accueil des animaux", 'pet', 'daypack', 1, 0, '', 'phase_6months');
      } else {
        add(`Trouver et réserver une pension ou un pet-sitter de confiance (${petsDesc})`, 'pet', 'daypack', 1, 0, '', 'phase_6months');
      }
    }

    // =========================================================
    // 2. PHASE : PRÉPARATIFS (6 MOIS À J-7)
    // =========================================================
    add("Avertir sa banque du voyage (débloquer plafonds et cartes à l'étranger)", 'admin', 'daypack', 1, 0, '', 'phase_prep');
    add('Vérifier son forfait mobile international ou commander une eSIM', 'tech', 'daypack', 1, 0, '', 'phase_prep');

    if (p.adultsWomen > 0) {
      add('Pilule contraceptive / Contraception (+ ordonnance & plaquettes de réserve)', 'health', 'daypack', p.adultsWomen, 20, 'cabin-only', 'phase_prep');
    }

    if (needsAdapter) {
      add(`Commander l'adaptateur de prise de courant (${country.plug})`, 'tech', 'daypack', Math.max(1, totalAdults), 110, '', 'phase_prep');
    }

    add('Télécharger les cartes hors-ligne (Google Maps / Maps.me)', 'tech', 'daypack', 1, 0, '', 'phase_prep');
    add(`Télécharger les applications utiles locales (${country.name})`, 'tech', 'daypack', 1, 0, '', 'phase_prep');
    add('Renouveler les ordonnances et constituer le stock de traitements médicaux', 'health', 'daypack', 1, 0, '', 'phase_prep');
    add('Vérifier dimensions et poids autorisés des bagages (règles transporteur)', 'practical', 'daypack', 1, 0, '', 'phase_prep');

    if (transport === 'voiture') {
      add('Contrôle technique, révision & niveaux de la voiture (huile, pneus, lave-glace)', 'practical', 'daypack', 1, 0, '', 'phase_prep');
    }

    if (totalPets > 0) {
      if (p.pets.takesPet) {
        add(`Visite vétérinaire de contrôle + Traitement antiparasitaire (${petsDesc})`, 'pet', 'daypack', totalPets, 50, '', 'phase_prep');
        add('Vérifier la caisse de transport homologuée ou harnais sécurité voiture', 'pet', 'soute', totalPets, 2500, '', 'phase_prep');
      } else {
        add(`Confirmer la garde (${petsDesc}) et préparer le stock de nourriture${p.pets.cats > 0 ? ' & litière' : ''}`, 'pet', 'daypack', 1, 0, '', 'phase_prep');
      }
    }

    // =========================================================
    // 3. PHASE : LA VALISE (J-3 À J-1)
    // =========================================================
    if (laundryEnabled) {
      add('Lessive en feuilles / savon détachant + corde à linge voyage', 'hygiene', 'soute', 1, 80, '', 'phase_pack');
    }

    // --- Vêtements Hommes ---
    if (menCount > 0) {
      add('Boxers / Caleçons homme', 'clothes', 'soute', q * menCount, 60, '', 'phase_pack');
      add('Chaussettes homme', 'clothes', 'soute', q * menCount, 45, '', 'phase_pack');
      add('T-shirts / Hauts homme', 'clothes', 'soute', q * menCount, 160, '', 'phase_pack');
    }

    // --- Vêtements Femmes ---
    if (womenCount > 0) {
      add('Culottes / Sous-vêtements femme', 'clothes', 'soute', q * womenCount, 40, '', 'phase_pack');
      add('Soutiens-gorge / Brassières de confort', 'clothes', 'soute', Math.max(2, Math.min(q, 4)) * womenCount, 60, '', 'phase_pack');
      add('Collants / Bas (fins ou thermiques selon saison)', 'clothes', 'soute', Math.max(2, womenCount), 50, '', 'phase_pack');
      add('Chaussettes / Socquettes femme', 'clothes', 'soute', q * womenCount, 35, '', 'phase_pack');
      add('T-shirts / Tops / Chemisiers femme', 'clothes', 'soute', q * womenCount, 130, '', 'phase_pack');
    }

    // --- Garde-robe saisonnière commune ---
    const bottomsQty = Math.max(2, Math.ceil(q / 3)) * Math.max(1, totalAdults);
    const sweatersQty = Math.max(2, Math.ceil(q / 5)) * Math.max(1, totalAdults);
    const pyjamaQty = Math.max(1, Math.ceil(q / 7)) * Math.max(1, totalAdults);

    if (season === 'ete') {
      add('Shorts / Pantacourts / Jupes', 'clothes', 'soute', bottomsQty, 250, '', 'phase_pack');
      add('Pantalon léger pour soirées / clim', 'clothes', 'soute', Math.max(1, totalAdults), 350, '', 'phase_pack');
      add('Tongs / Sandales confortables', 'clothes', 'soute', Math.max(1, totalAdults), 300, '', 'phase_pack');
      add('Lunettes de soleil polarisées', 'clothes', 'daypack', Math.max(1, totalAdults), 45, '', 'phase_pack');
      add('Casquette ou chapeau de soleil', 'clothes', 'daypack', Math.max(1, totalAdults), 80, '', 'phase_pack');
    } else if (season === 'hiver') {
      add('Pantalons chauds / Jeans', 'clothes', 'soute', bottomsQty, 480, '', 'phase_pack');
      add('Pulls chauds / Polaires', 'clothes', 'soute', sweatersQty, 420, '', 'phase_pack');
      add('Sous-vêtements thermiques (hauts & bas)', 'clothes', 'soute', Math.max(2, Math.ceil(q / 5)) * Math.max(1, totalAdults), 220, '', 'phase_pack');
      add("Doudoune ou manteau chaud d'hiver", 'clothes', 'porte', Math.max(1, totalAdults), 850, '', 'phase_pack');
      add('Gants chauds', 'clothes', 'cabine', Math.max(1, totalAdults), 90, '', 'phase_pack');
      add('Bonnet & Écharpe ou tour de cou', 'clothes', 'cabine', Math.max(1, totalAdults), 140, '', 'phase_pack');
    } else if (season === 'tropical') {
      add('Vêtements légers et respirants', 'clothes', 'soute', bottomsQty, 220, '', 'phase_pack');
      add('Tongs / Sandales', 'clothes', 'soute', Math.max(1, totalAdults), 300, '', 'phase_pack');
      add('Lunettes de soleil', 'clothes', 'daypack', Math.max(1, totalAdults), 45, '', 'phase_pack');
      add('Chapeau respirant / Casquette', 'clothes', 'daypack', Math.max(1, totalAdults), 80, '', 'phase_pack');
      add('Poncho ou veste de pluie ultra-légère', 'clothes', 'daypack', Math.max(1, totalAdults), 220, '', 'phase_pack');
    } else {
      add('Pantalons confortables de mi-saison', 'clothes', 'soute', bottomsQty, 420, '', 'phase_pack');
      add('Pulls légers ou sweats', 'clothes', 'cabine', sweatersQty, 350, '', 'phase_pack');
      add('Veste coupe-vent imperméable', 'clothes', 'cabine', Math.max(1, totalAdults), 380, '', 'phase_pack');
      add('Parapluie compact de voyage', 'clothes', 'daypack', 1, 240, '', 'phase_pack');
    }

    add('Pyjama / Tenue de nuit', 'clothes', 'soute', pyjamaQty, 250, '', 'phase_pack');
    add('Chaussures de marche confortables', 'clothes', 'porte', Math.max(1, totalAdults), 750, '', 'phase_pack');

    // --- Bébés (< 2 ans) ---
    if (p.babies > 0) {
      const diaperCount = Math.max(8, Math.min(tripDays, 14) * 5 * p.babies);
      add(`Couches bébé (${diaperCount} unités)`, 'baby', 'soute', diaperCount, 35, '', 'phase_pack');
      add('Paquets de lingettes nettoyantes épaisses', 'baby', 'cabine', Math.max(1, Math.ceil(Math.min(tripDays, 14) / 5)) * p.babies, 260, '', 'phase_pack');
      add('Bodys et tenues de rechange bébé', 'baby', 'soute', Math.max(4, Math.min(18, Math.ceil(q * 1.3))) * p.babies, 110, '', 'phase_pack');
      add('Biberons + Tétines + Goupillon', 'baby', 'cabine', 2 * p.babies, 120, '', 'phase_pack');
      add('Lait en poudre ou petits pots / compotes', 'baby', 'cabine', p.babies, 800, '', 'phase_pack');
      add('Bavoirs lavables en silicone ou tissu', 'baby', 'cabine', 3 * p.babies, 40, '', 'phase_pack');
      add('Doudou(s) fétiche + Attache-tétine', 'baby', 'cabine', p.babies, 80, '', 'phase_pack');
      add('Gigoteuse / Turbulette adaptée', 'baby', 'soute', p.babies, 350, '', 'phase_pack');
      add('Poussette compacte cabine ou porte-bébé physiologique', 'baby', 'cabine', p.babies, 4500, '', 'phase_pack');
      add('Trousse soins bébé (thermomètre, sérum phy, paracétamol pédiatrique)', 'baby', 'cabine', 1, 250, '', 'phase_pack');
      add('Trousse toilette bébé (gel lavant doux, crème hydratante)', 'baby', 'soute', 1, 300, '', 'phase_pack');
    }

    // --- Enfants (2-12 ans) ---
    if (p.childrenBoys > 0) {
      add('Tenues garçon (t-shirts, pantalons/shorts)', 'baby', 'soute', (q + 1) * p.childrenBoys, 200, '', 'phase_pack');
      add('Boxers / Slips & chaussettes garçon', 'baby', 'soute', (q + 1) * p.childrenBoys, 60, '', 'phase_pack');
    }
    if (p.childrenGirls > 0) {
      add('Tenues fille (t-shirts, robes/shorts/jupes)', 'baby', 'soute', (q + 1) * p.childrenGirls, 190, '', 'phase_pack');
      add('Culottes & chaussettes / collants fille', 'baby', 'soute', (q + 1) * p.childrenGirls, 55, '', 'phase_pack');
      add('Barrettes & élastiques à cheveux fille', 'baby', 'daypack', 1, 30, '', 'phase_pack');
    }
    if (totalChildren > 0) {
      add('Pyjamas enfant', 'baby', 'soute', 2 * totalChildren, 180, '', 'phase_pack');
      add("Doudou / Peluche préférée de l'enfant", 'baby', 'daypack', totalChildren, 100, '', 'phase_pack');
      add('Brosse à dents enfant + Dentifrice junior', 'baby', 'cabine', totalChildren, 70, '', 'phase_pack');
      add('Cahier de coloriage, feutres & livres de jeux', 'practical', 'daypack', totalChildren, 250, '', 'phase_pack', '', 'child');
      add('Gourde enfant étanche', 'practical', 'daypack', totalChildren, 150, '', 'phase_pack', '', 'child');
      add('Crème solaire enfant très haute protection SPF 50+', 'health', 'soute', 1, 150, '', 'phase_pack', '', 'child');
      if (transport === 'voiture') {
        add('Réhausseur auto / Siège enfant adapté', 'practical', 'soute', totalChildren, 2000, '', 'phase_pack', '', 'child');
      }
    }

    // --- Ados (13-17 ans) ---
    if (p.teensBoys > 0) {
      add('Tenues ado garçon', 'clothes', 'soute', q * p.teensBoys, 350, '', 'phase_pack');
      add('Boxers & chaussettes ado garçon', 'clothes', 'soute', q * p.teensBoys, 80, '', 'phase_pack');
    }
    if (p.teensGirls > 0) {
      add('Tenues ado fille', 'clothes', 'soute', q * p.teensGirls, 320, '', 'phase_pack');
      add('Sous-vêtements, brassières & collants ado fille', 'clothes', 'soute', q * p.teensGirls, 70, '', 'phase_pack');
    }
    if (totalTeens > 0) {
      add('Smartphone + Chargeur personnel + Câble long', 'tech', 'daypack', totalTeens, 200, '', 'phase_pack', '', 'child');
      add('Écouteurs sans fil ou casque audio ado', 'tech', 'daypack', totalTeens, 180, 'cabin-only', 'phase_pack', '', 'child');
      add('Batterie externe individuelle (Powerbank)', 'tech', 'daypack', totalTeens, 220, 'cabin-only', 'phase_pack', '', 'child');
      add('Trousse de toilette ado (déodorant, soins visage)', 'hygiene', 'cabine', totalTeens, 200, '', 'phase_pack', '', 'child');
      add("Carte d'identité / Passeport ado + Carte étudiant/transport", 'admin', 'daypack', totalTeens, 30, 'cabin-only', 'phase_pack', '', 'child');
    }

    // --- Animaux (si voyage avec nous) ---
    if (totalPets > 0 && p.pets.takesPet) {
      add(`Croquettes / Alimentation (${petsDesc}) pour ${tripDays} jour${tripDays > 1 ? 's' : ''}`, 'pet', 'soute', totalPets, Math.round(250 * Math.min(tripDays, 21)), '', 'phase_pack');
      add('Gamelle de voyage pliable + Gourde pour animal', 'pet', 'daypack', totalPets, 250, '', 'phase_pack');
      if (p.pets.dogs > 0) {
        add('Laisse, collier avec médaille & coordonnées + Harnais de sécurité (chien)', 'pet', 'daypack', p.pets.dogs, 350, '', 'phase_pack');
        add('Sacs à déjections canines (rouleaux)', 'pet', 'soute', Math.max(1, Math.ceil(tripDays / 7)) * p.pets.dogs, 200, '', 'phase_pack');
      }
      if (p.pets.cats > 0) {
        add('Litière compacte de voyage + pelle (chat)', 'pet', 'soute', p.pets.cats, 300, '', 'phase_pack');
        add("Harnais / collier avec médaille d'identification (chat)", 'pet', 'daypack', p.pets.cats, 120, '', 'phase_pack');
      }
      if (p.pets.others > 0) {
        add('Accessoires & équipement spécifique (autre animal)', 'pet', 'daypack', p.pets.others, 300, '', 'phase_pack');
      }
      add('Jouet fétiche / Plaid avec odeur familière', 'pet', 'daypack', totalPets, 200, '', 'phase_pack');
      add('Trousse premiers soins animal (pince à tiques, antiseptique)', 'pet', 'daypack', 1, 150, '', 'phase_pack');
    }

    // --- Tech & Électronique ---
    add('Téléphone + Chargeur rapide + Câbles USB', 'tech', 'daypack', Math.max(1, totalAdults), 180, '', 'phase_pack');
    add('Batterie externe (Powerbank — Cabine obligatoire)', 'tech', 'daypack', Math.max(1, Math.ceil(totalAdults / 2)), 280, 'cabin-only', 'phase_pack');
    add('Écouteurs ou casque à réduction de bruit', 'tech', 'daypack', Math.max(1, totalAdults), 180, 'cabin-only', 'phase_pack');

    if (transport === 'voiture') {
      add('Chargeur allume-cigare USB + Support smartphone voiture', 'tech', 'daypack', 1, 150, '', 'phase_pack');
    }

    // --- Hygiène & Soins ---
    if (womenCount > 0) {
      add('Protections périodiques & hygiéniques (serviettes, tampons, cup, culottes de règles)', 'hygiene', 'cabine', 1, 150, '', 'phase_pack');
      add('Trousse maquillage & Démaquillant / Lingettes réutilisables', 'hygiene', 'cabine', 1, 200, '', 'phase_pack');
      add('Élastiques, pinces à cheveux & brosse démêlante', 'hygiene', 'daypack', 1, 80, '', 'phase_pack');
      add('Rasoir femme / Épilateur / Bandes de cire', 'hygiene', isPlane ? 'soute' : 'cabine', 1, 90, isPlane ? 'hold-only' : '', 'phase_pack');
      add('Crème hydratante visage / Sérum de soin', 'hygiene', 'cabine', 1, 100, '', 'phase_pack');
    }

    if (menCount > 0) {
      add('Rasoir (manuel ou électrique) + Mousse / Gel à raser', 'hygiene', isPlane ? 'soute' : 'cabine', 1, 160, isPlane ? 'hold-only' : '', 'phase_pack');
      add('Baume / Lotion après-rasage hydratante', 'hygiene', 'cabine', 1, 90, '', 'phase_pack');
      add('Tondeuse barbe / cheveux + Câble de recharge', 'tech', 'cabine', 1, 280, 'cabin-only', 'phase_pack');
    }

    add('Brosse à dents + Dentifrice', 'hygiene', 'cabine', Math.max(1, totalAdults), 80, '', 'phase_pack');
    add(isPlane ? 'Pochette transparente liquides < 100ml (1L max)' : 'Gel douche & Shampoing', 'hygiene', 'cabine', 1, 280, '', 'phase_pack');
    add('Déodorant', 'hygiene', 'cabine', Math.max(1, totalAdults), 75, '', 'phase_pack');
    add('Brosse / Peigne + Mouchoirs', 'hygiene', 'daypack', 1, 80, '', 'phase_pack');
    add('Coupe-ongles / Pince à épiler', 'hygiene', isPlane ? 'soute' : 'cabine', 1, 50, isPlane ? 'hold-only' : '', 'phase_pack');

    // --- Santé & Pharmacie ---
    add('Traitements personnels réguliers (+ ordonnances)', 'health', 'daypack', 1, 100, 'cabin-only', 'phase_pack');
    add('Paracétamol / Ibuprofène + Pansements adhésifs', 'health', 'daypack', 1, 60, '', 'phase_pack');
    if (season === 'ete' || season === 'tropical' || actSet.has('plage') || actSet.has('ski')) {
      add('Crème solaire SPF 50+ & Baume à lèvres protecteur', 'health', 'soute', 1, 150, '', 'phase_pack');
    }
    if (transport === 'bateau') {
      add('Comprimés contre le mal de mer', 'health', 'daypack', 1, 30, '', 'phase_pack');
    }

    // --- Activités Enrichies ---
    const activeTravelers = Math.max(1, totalAdults + totalTeens + totalChildren);
    const adultTravelers = Math.max(1, totalAdults);
    const nonBabyTravelers = Math.max(1, totalPeople - p.babies);

    if (actSet.has('lecture')) {
      add('Livre de poche ou Liseuse (Kindle/Kobo)', 'practical', 'daypack', 1, 220, 'cabin-only', 'phase_pack');
      add('Coussin tour de cou ergonomique / repos', 'practical', 'daypack', 1, 110, '', 'phase_pack');
      add('Lampe de lecture nomade ou marque-page', 'practical', 'daypack', 1, 45, '', 'phase_pack');
    }

    if (actSet.has('soiree')) {
      if (womenCount > 0) {
        add('Robe élégante ou combinaison chic + Bijoux / Pochette', 'clothes', 'soute', womenCount, 320, '', 'phase_pack');
        add('Chaussures habillées / Escarpins ou sandales chic', 'clothes', 'soute', womenCount, 450, '', 'phase_pack');
      }
      if (menCount > 0) {
        add('Chemise habillée + Pantalon chic / Chino + Ceinture', 'clothes', 'soute', menCount, 380, '', 'phase_pack');
        add('Chaussures de ville habillées homme', 'clothes', 'soute', menCount, 600, '', 'phase_pack');
      }
      add('Parfum / Eau de toilette (flacon voyage < 100ml)', 'hygiene', 'cabine', 1, 120, '', 'phase_pack');
    }

    if (actSet.has('plage')) {
      if (womenCount > 0) {
        add('Maillot de bain femme (1 ou 2 pièces) + Paréo / Robe de plage', 'clothes', 'cabine', 2 * womenCount, 160, '', 'phase_pack');
      }
      if (menCount > 0) {
        add('Short de bain / Maillot homme', 'clothes', 'cabine', 2 * menCount, 140, '', 'phase_pack');
      }
      if (totalChildren > 0) {
        add('Maillots de bain enfant', 'clothes', 'cabine', 2 * totalChildren, 110, '', 'phase_pack');
      }
      add('Serviette de plage en microfibre compacte', 'practical', 'soute', nonBabyTravelers, 220, '', 'phase_pack');
      add('Sac de plage léger / Panier pliable', 'practical', 'soute', 1, 200, '', 'phase_pack');
    }

    if (actSet.has('piscine')) {
      if (womenCount > 0) {
        add('Maillot de bain de rechange femme', 'clothes', 'cabine', womenCount, 140, '', 'phase_pack');
      }
      if (menCount > 0) {
        add('Maillot de bain de rechange homme', 'clothes', 'cabine', menCount, 130, '', 'phase_pack');
      }
      add('Claquettes ou sandales imperméables spa/bassin', 'practical', 'soute', nonBabyTravelers, 250, '', 'phase_pack');
      add('Bonnet de bain (si requis en bassin)', 'practical', 'cabine', nonBabyTravelers, 40, '', 'phase_pack');
    }

    if (actSet.has('randonnee')) {
      add('Chaussures de randonnée crantées', 'clothes', 'porte', activeTravelers, 950, '', 'phase_pack');
      add('Sac à dos de randonnée (20-30L)', 'practical', 'daypack', Math.max(1, Math.ceil(adultTravelers / 2)), 650, '', 'phase_pack');
      add('Gourde isotherme 1L à 1.5L', 'practical', 'daypack', activeTravelers, 180, '', 'phase_pack');
      add('Bâtons de marche télescopiques', 'practical', isPlane ? 'soute' : 'daypack', Math.max(1, Math.ceil(adultTravelers / 2)), 480, isPlane ? 'hold-only' : '', 'phase_pack');
      add('Pansements seconde peau anti-ampoules', 'health', 'daypack', 1, 30, '', 'phase_pack');
    }

    if (actSet.has('ski')) {
      add('Skis / Snowboard & Bâtons', 'practical', 'soute', activeTravelers, 4500, '', 'phase_pack');
      add('Chaussures de ski', 'practical', 'soute', activeTravelers, 3200, '', 'phase_pack');
      add('Casque & Masque de ski anti-buée', 'practical', 'cabine', activeTravelers, 650, '', 'phase_pack');
      add('Blouson & Pantalon de ski imperméables', 'clothes', 'soute', activeTravelers, 1400, '', 'phase_pack');
      add('Gants de ski chauds & imperméables', 'clothes', 'cabine', activeTravelers, 180, '', 'phase_pack');
      add('Chaussettes de ski thermiques', 'clothes', 'soute', 3 * activeTravelers, 90, '', 'phase_pack');
      add("Après-ski / Bottes d'hiver chaudes", 'clothes', 'soute', activeTravelers, 900, '', 'phase_pack');
      add('Chaufferettes jetables mains & pieds', 'practical', 'cabine', 2 * activeTravelers, 60, '', 'phase_pack');
    }

    if (actSet.has('camping')) {
      add('Tente ou Tarp léger + Sardines', 'practical', 'soute', 1, 1800, '', 'phase_pack');
      add('Sac de couchage adapté à la température', 'practical', 'soute', activeTravelers, 950, '', 'phase_pack');
      add('Matelas de sol isolant', 'practical', 'soute', activeTravelers, 450, '', 'phase_pack');
      add('Lampe frontale + Piles / Câble de recharge', 'practical', 'daypack', Math.max(1, Math.ceil(adultTravelers / 2)), 110, '', 'phase_pack');
      add('Réchaud + Popote compacte + Couverts', 'practical', 'soute', 1, 380, 'hold-only', 'phase_pack');
      add('Couteau de poche multifonction', 'practical', 'soute', 1, 120, 'hold-only', 'phase_pack');
    }

    if (actSet.has('sport')) {
      add('Tenue de sport respirante (short + t-shirt technique)', 'clothes', 'soute', 2 * adultTravelers, 220, '', 'phase_pack');
      add("Chaussures de running / baskets d'entraînement", 'clothes', 'soute', adultTravelers, 650, '', 'phase_pack');
      add('Chaussettes techniques sport', 'clothes', 'soute', 2 * adultTravelers, 50, '', 'phase_pack');
      add('Brassard ou ceinture porte-téléphone', 'practical', 'daypack', adultTravelers, 60, '', 'phase_pack');
    }

    if (actSet.has('velo')) {
      add('Cuissard vélo rembourré + Maillot cyclisme', 'clothes', 'soute', 2 * adultTravelers, 260, '', 'phase_pack');
      add('Casque de vélo homologué', 'practical', 'cabine', adultTravelers, 320, '', 'phase_pack');
      add('Gants courts / Mitaines de vélo', 'clothes', 'daypack', adultTravelers, 50, '', 'phase_pack');
      add('Mini-pompe + Chambre à air + Démonte-pneus', 'practical', 'soute', 1, 250, '', 'phase_pack');
    }

    if (actSet.has('culture')) {
      add('Guide touristique papier de la région', 'practical', 'daypack', 1, 380, '', 'phase_pack');
      add('Carnet de voyage personnel + Stylos', 'practical', 'daypack', 1, 140, '', 'phase_pack');
      add('Billets coupe-file imprimés ou enregistrés dans Wallet', 'admin', 'daypack', 1, 10, '', 'phase_pack');
    }

    if (actSet.has('nautique')) {
      add('Masque et tuba ergonomique', 'practical', 'soute', nonBabyTravelers, 350, '', 'phase_pack');
      add("Chaussures d'eau / Aquashoes (protection rochers)", 'clothes', 'soute', nonBabyTravelers, 300, '', 'phase_pack');
      add('Pochette étanche certifiée IPX8 pour téléphone', 'practical', 'daypack', Math.max(1, Math.ceil(adultTravelers / 2)), 70, '', 'phase_pack');
    }

    if (actSet.has('jeux')) {
      add('Jeux de cartes nomades (Uno, Skyjo, 54 cartes)', 'practical', 'daypack', 1, 120, '', 'phase_pack');
      add('Mini-jeu de société format voyage', 'practical', 'daypack', 1, 220, '', 'phase_pack');
    }

    if (actSet.has('pro')) {
      add('Ordinateur portable + Chargeur USB-C', 'tech', 'daypack', 1, 1500, 'cabin-only', 'phase_pack');
      add('Souris sans fil + Adaptateur HDMI', 'tech', 'daypack', 1, 140, '', 'phase_pack');
      add('Badge pro / Carnet de notes & stylo', 'admin', 'daypack', 1, 120, '', 'phase_pack');
    }

    if (actSet.has('photo')) {
      add('Appareil photo reflex / hybride + Objectifs', 'tech', 'daypack', 1, 950, 'cabin-only', 'phase_pack');
      add('Batteries de rechange + Chargeur dédié', 'tech', 'daypack', 2, 130, 'cabin-only', 'phase_pack');
      add('Cartes mémoires SD haute vitesse', 'tech', 'daypack', 2, 15, '', 'phase_pack');
    }

    // Accessoires pays
    country.accessories.forEach(acc => {
      if (needsAdapter && acc.toLowerCase().includes('adaptateur')) return;
      add(acc, 'practical', 'soute', 1, 120, '', 'phase_pack');
    });

    if (transport === 'voiture') {
      add('Gilet jaune de sécurité + Triangle de signalisation', 'practical', 'daypack', 1, 450, '', 'phase_pack');
      if (season === 'hiver' || actSet.has('ski')) {
        add('Chaînes ou chaussettes neige pour pneus', 'practical', 'soute', 1, 2500, '', 'phase_pack');
      }
    }

    // Clôture valise
    add('Peser chaque bagage au pèse-valise (respect franchise)', 'practical', 'daypack', 1, 0, '', 'phase_pack');
    add('Télécharger films, séries et podcasts hors-ligne pour le trajet', 'tech', 'daypack', 1, 0, '', 'phase_pack');
    add('Sac pliable en toile (Totebag) pour courses et souvenirs', 'souvenirs', 'daypack', 1, 60, '', 'phase_pack');

    // =========================================================
    // 4. PHASE : JOUR J & MAISON (AVANT DÉPART)
    // =========================================================
    add('Fermer toutes les fenêtres, baies vitrées et volets', 'house', 'porte', 1, 0, '', 'phase_departure');
    add('Vider le frigo des aliments périssables et sortir les poubelles', 'house', 'porte', 1, 0, '', 'phase_departure');
    add("Couper l'arrivée d'eau générale", 'house', 'porte', 1, 0, '', 'phase_departure');
    add('Couper le gaz / passer le chauffe-eau en mode absence', 'house', 'porte', 1, 0, '', 'phase_departure');
    add('Débrancher les appareils électriques non indispensables', 'house', 'porte', 1, 0, '', 'phase_departure');
    add('Baisser le chauffage ou éteindre la climatisation', 'house', 'porte', 1, 0, '', 'phase_departure');
    add("Arroser les plantes d'intérieur et d'extérieur", 'house', 'porte', 1, 0, '', 'phase_departure');
    add('Passeports, billets de transport et cartes de paiement sur soi', 'admin', 'porte', 1, 0, 'cabin-only', 'phase_departure');
    add(`Moyens de paiement (cartes bancaires + espèces ${country.currency})`, 'admin', 'porte', 1, 50, 'cabin-only', 'phase_departure');
    add('Smartphones chargés à 100% + Powerbanks dans le sac cabine', 'tech', 'daypack', 1, 0, 'cabin-only', 'phase_departure');

    if (p.babies > 0) {
      add('Sac à langer du trajet prêt (biberon, dosettes, couches, change, doudou)', 'baby', 'daypack', 1, 0, '', 'phase_departure');
    }

    if (totalPets > 0) {
      if (p.pets.takesPet) {
        add(`Sortir ${totalPets > 1 ? 'les animaux' : "l'animal"} pour ses besoins et donner à boire avant départ`, 'pet', 'porte', 1, 0, '', 'phase_departure');
      } else {
        add(`Déposer ${totalPets > 1 ? 'les animaux' : "l'animal"} chez le gardien ou laisser les clés au pet-sitter`, 'pet', 'porte', 1, 0, '', 'phase_departure');
      }
    }

    add("Verrouiller la porte d'entrée à double tour", 'house', 'porte', 1, 0, '', 'phase_departure');

    // =========================================================
    // 5. PHASE : AU RETOUR (CHECK CHAMBRE & VALISE RETOUR)
    // =========================================================
    add('Tour méticuleux de la chambre : inspecter sous les lits et derrière les portes', 'souvenirs', 'porte', 1, 0, '', 'phase_return');
    add('Vérifier toutes les prises murales (ne laisser aucun chargeur ni adaptateur)', 'tech', 'porte', 1, 0, '', 'phase_return');
    add('Vérifier la salle de bain (brosses à dents, trousses, produits douche)', 'hygiene', 'porte', 1, 0, '', 'phase_return');
    add('Vérifier le coffre-fort de la chambre (passeports, bijoux, devises restantes)', 'admin', 'daypack', 1, 0, 'cabin-only', 'phase_return');
    add('Ranger soigneusement les souvenirs fragiles au milieu des vêtements en soute', 'souvenirs', 'soute', 1, 0, '', 'phase_return');
    add('Isoler le linge sale dans des sacs séparés pour faciliter le déballage', 'clothes', 'soute', 1, 0, '', 'phase_return');
    add('Conserver les factures & formulaires de détaxe aéroportuaire', 'admin', 'daypack', 1, 0, '', 'phase_return');
    add("Télécharger les cartes d'embarquement / billets retour sur le smartphone", 'admin', 'daypack', 1, 0, '', 'phase_return');

    return { baggages, items, activities: Array.from(actSet), party: p, laundry: laundryEnabled };
  }

  function createTripObject({ name, countryKey, tripType, season, transport, activities = [], party = currentParty, days, departureDate = '', laundry = false, blank = false }) {
    const tType = TRIP_TYPES[tripType] || TRIP_TYPES.weekend;
    const tripDays = Math.max(1, Math.min(365, Math.round(Number(days) || tType.duration || 3)));
    const normalizedParty = normalizeParty(party);
    const generated = blank
      ? { baggages: JSON.parse(JSON.stringify((TRANSPORTS[transport] || TRANSPORTS.avion).baggages)), items: [], activities: [], party: normalizedParty, laundry: Boolean(laundry) }
      : generateChecklist({ countryKey, tripType, season, transport, activities, party: normalizedParty, days: tripDays, laundry });

    return {
      id: 'trip_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      name: sanitizeText(name, 100) || (COUNTRIES[countryKey]?.name || 'Mon Voyage'),
      countryKey: COUNTRIES[countryKey] ? countryKey : 'france',
      tripType: TRIP_TYPES[tripType] ? tripType : 'weekend',
      days: tripDays,
      departureDate: sanitizeDateStr(departureDate),
      laundry: Boolean(generated.laundry),
      season: SEASONS[season] ? season : 'misaison',
      transport: TRANSPORTS[transport] ? transport : 'avion',
      party: generated.party || normalizedParty,
      activities: generated.activities,
      baggages: generated.baggages,
      items: generated.items
    };
  }

  // === STATE & LOCALSTORAGE ===
  function createEmptyAppState() {
    return {
      trips: [],
      activeTripId: null,
      customTemplates: [],
      viewMode: 'chrono',
      filterPhase: 'all',
      filterBaggage: 'all',
      filterStatus: 'all',
      searchQuery: '',
      collapsedSections: {}
    };
  }

  function loadState() {
    const lastUid = localStorage.getItem(LAST_UID_KEY);
    const saved = localStorage.getItem(STORAGE_KEY)
      || (lastUid ? localStorage.getItem(`valise_user_data_${lastUid}`) : null)
      || localStorage.getItem(LEGACY_STORAGE_KEY_V3)
      || localStorage.getItem(LEGACY_STORAGE_KEY_V2);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const clean = sanitizeImportedState(parsed);
        if (clean) {
          appState = clean;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
          return;
        }
      } catch (e) {
        console.warn('Erreur lecture cache local:', e);
      }
    }
    appState = createEmptyAppState();
  }

  function saveState(shouldRender = true, skipCloudPush = false) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (e) {
      console.warn('Erreur sauvegarde localStorage:', e);
      showToast('Espace de stockage local saturé');
    }
    const fb = window.ValiseFirebase;
    if (!skipCloudPush && !_suppressCloudSync && fb?.estConnecteFirebase?.() && cloudState.initialSyncDone) {
      clearTimeout(_syncTimer);
      cloudState.syncStatus = 'syncing';
      cloudState.syncError = null;
      majStatutSyncModal();
      _syncTimer = setTimeout(async () => {
        try {
          await fb.syncAllUserDataToFirestore(appState);
          cloudState.syncStatus = 'synced';
          cloudState.lastSyncedAt = new Date().toISOString();
          majStatutSyncModal();
        } catch (err) {
          console.warn('Sync Firestore:', err);
          cloudState.syncStatus = 'error';
          cloudState.syncError = err?.code === 'permission-denied'
            ? 'Accès Firestore refusé (vérifiez que votre e-mail est bien vérifié et autorisé).'
            : (err?.message || 'Erreur de synchronisation Firestore');
          majStatutSyncModal();
        }
      }, 450);
    }
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
  function showToast(message, options = {}) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const { actionLabel = '', onAction = null, duration = actionLabel ? 4200 : 2600, replaceId = '' } = options;
    if (replaceId) {
      container.querySelectorAll(`[data-toast-id="${CSS.escape(replaceId)}"]`).forEach(old => old.remove());
    }

    const el = document.createElement('div');
    el.className = 'toast';
    if (replaceId) el.dataset.toastId = replaceId;

    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    el.appendChild(msgSpan);

    let removed = false;
    const dismiss = () => {
      if (removed) return;
      removed = true;
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.18s ease';
      setTimeout(() => el.remove(), 200);
    };

    if (actionLabel && typeof onAction === 'function') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast-action';
      btn.textContent = actionLabel;
      btn.addEventListener('click', () => {
        dismiss();
        onAction();
      });
      el.appendChild(btn);
    }

    container.appendChild(el);
    setTimeout(dismiss, duration);
  }

  function showConfirm(title, message, okLabel = 'Confirmer', onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    const okBtn = document.getElementById('confirmOkBtn');
    okBtn.textContent = okLabel;
    confirmCallback = onConfirm;
    document.getElementById('confirmModal').classList.add('open');
  }

  function closeConfirmModal() {
    document.getElementById('confirmModal')?.classList.remove('open');
    confirmCallback = null;
  }

  // === INITIALISATION ===
  document.addEventListener('DOMContentLoaded', () => {
    const versionLabel = `v${CURRENT_APP_VERSION}`;
    const menuVerEl = document.getElementById('menuVersionBadge');
    if (menuVerEl) menuVerEl.textContent = versionLabel;

    initTheme();
    loadState();
    initFormComponents();
    initListeners();
    initAuthModule();
    render();

    if (!isNativeAndroidApp() && window.location.protocol.startsWith('http') && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    // Vérification automatique des mises à jour depuis Git au lancement
    setTimeout(() => checkForAppUpdates(false), 2000);
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
        <button type="button" class="visual-card-btn ${isSelected ? 'selected' : ''}" data-transport="${escapeHtml(key)}">
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
    if (!TRANSPORTS[key]) return;
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
        <button type="button" class="visual-card-btn ${isSelected ? 'selected' : ''}" data-season="${escapeHtml(key)}">
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
    if (!SEASONS[key]) return;
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
        <button type="button" class="visual-card-btn ${isSelected ? 'selected' : ''}" data-trip-type="${escapeHtml(key)}">
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
    if (!TRIP_TYPES[key]) return;
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
    if (Number.isNaN(parsed)) return;
    selectedDays = Math.max(1, Math.min(365, parsed));
    updatePrefillPreview();
  }

  function renderActivityChips() {
    const container = document.getElementById('activityChipsContainer');
    if (!container) return;
    container.innerHTML = Object.values(ACTIVITIES).map(act => {
      const active = selectedActivities.has(act.id);
      return `
        <button type="button" class="activity-chip ${active ? 'selected' : ''}" data-activity="${escapeHtml(act.id)}">
          <span class="chip-svg">${act.iconSvg}</span>
          <span class="chip-label">${escapeHtml(act.label)}</span>
          ${active ? `<span class="chip-check">${SVG_CHECK}</span>` : ''}
        </button>
      `;
    }).join('');
  }

  // === PERSONNES & ANIMAUX ===
  function setChildrenAccordionOpen(isOpen) {
    const box = document.getElementById('childrenAccordionBox');
    const btn = document.getElementById('btnToggleChildrenAccordion');
    const body = document.getElementById('childrenAccordionBody');
    if (!box || !btn || !body) return;
    box.classList.toggle('is-open', isOpen);
    btn.setAttribute('aria-expanded', String(isOpen));
    body.style.display = isOpen ? 'block' : 'none';
  }

  function adjustParty(role, delta) {
    if (role === 'adultsMen') {
      const next = Math.max(0, (currentParty.adultsMen || 0) + delta);
      if (next === 0 && (currentParty.adultsWomen || 0) === 0) return;
      currentParty.adultsMen = next;
    } else if (role === 'adultsWomen') {
      const next = Math.max(0, (currentParty.adultsWomen || 0) + delta);
      if (next === 0 && (currentParty.adultsMen || 0) === 0) return;
      currentParty.adultsWomen = next;
    } else if (['teensBoys', 'teensGirls', 'childrenBoys', 'childrenGirls', 'babies'].includes(role)) {
      currentParty[role] = Math.max(0, Math.min(15, (currentParty[role] || 0) + delta));
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

    const childrenBadge = document.getElementById('childrenSummaryBadge');
    if (childrenBadge) {
      const teensCount = p.teensBoys + p.teensGirls;
      const kidsCount = p.childrenBoys + p.childrenGirls;
      const badgeParts = [];
      if (teensCount > 0) badgeParts.push(`${teensCount} ado${teensCount > 1 ? 's' : ''}`);
      if (kidsCount > 0) badgeParts.push(`${kidsCount} enfant${kidsCount > 1 ? 's' : ''}`);
      if (p.babies > 0) badgeParts.push(`${p.babies} bébé${p.babies > 1 ? 's' : ''}`);
      childrenBadge.textContent = badgeParts.length > 0 ? badgeParts.join(', ') : 'Aucun';
      childrenBadge.classList.toggle('has-items', badgeParts.length > 0);
    }

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

  const syncPartySteppersUI = updatePartyDisplay;

  function adjustPet(kind, delta) {
    if (!['dogs', 'cats', 'others'].includes(kind)) return;
    if (!currentParty.pets) currentParty.pets = { enabled: true, dogs: 0, cats: 0, others: 0, takesPet: true };
    const current = Number(currentParty.pets[kind]) || 0;
    currentParty.pets[kind] = Math.max(0, Math.min(10, current + delta));
    syncPartySteppersUI();
    updatePrefillPreview();
  }

  function onPetToggleChange(checked) {
    if (!currentParty.pets) currentParty.pets = { enabled: false, dogs: 0, cats: 0, others: 0, takesPet: true };
    currentParty.pets.enabled = Boolean(checked);
    if (checked && getTotalPets(currentParty.pets) === 0) {
      currentParty.pets.dogs = 1;
    }
    syncPartySteppersUI();
    updatePrefillPreview();
  }

  // === SÉLECTEUR DE DESTINATION ===
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
    const regions = ['all', 'Europe', 'Asie', 'Amérique du Nord', 'Amérique du Sud', 'Afrique', 'Autre / Grand Nord'];
    const labels = {
      all: 'Toutes',
      Europe: 'Europe',
      Asie: 'Asie',
      'Amérique du Nord': 'Amér. Nord',
      'Amérique du Sud': 'Amér. Sud',
      Afrique: 'Afrique',
      'Autre / Grand Nord': 'Grand Nord'
    };

    container.innerHTML = regions.map(reg => `
      <button type="button" class="region-tab ${currentRegionFilter === reg ? 'active' : ''}" data-region="${escapeHtml(reg)}">
        ${escapeHtml(labels[reg] || reg)}
      </button>
    `).join('');
  }

  function renderCountryPickerList(regionFilter = 'all', query = '') {
    const listEl = document.getElementById('countryPickerList');
    if (!listEl) return;

    const entries = Object.entries(COUNTRIES).filter(([, c]) => {
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
        <button type="button" class="country-picker-item ${isSelected ? 'selected' : ''}" data-country-key="${escapeHtml(key)}">
          <span class="country-item-flag">${getCountryFlagSvg(key)}</span>
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
    selectedCountryKey = COUNTRIES[key] ? key : 'france';
    const c = COUNTRIES[selectedCountryKey];
    document.getElementById('tripCountrySelect').value = selectedCountryKey;
    document.getElementById('selectedCountryFlag').innerHTML = getCountryFlagSvg(key);
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
      days: selectedDays,
      laundry: selectedLaundry
    });

    const summary = formatPartySummary(party, { petMode: 'verbose' });
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
          <span class="badge-tag-subtle">${selectedDays} jour${selectedDays > 1 ? 's' : ''}${selectedLaundry ? ' · avec lessive' : ''} · ${escapeHtml(summary)}</span>
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

  // === ÉCOUTEURS D'ÉVÉNEMENTS (DÉLÉGATION COMPLÈTE) ===
  function initListeners() {
    // Header & More Menu
    document.getElementById('btnThemeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('btn-auth-header')?.addEventListener('click', ouvrirModalAuth);
    document.getElementById('btnMenuAccount')?.addEventListener('click', () => {
      closeMoreMenu();
      ouvrirModalAuth();
    });
    document.getElementById('btnNewTripHeader')?.addEventListener('click', () => openTripModal(null));
    document.getElementById('btnTripSwitcher')?.addEventListener('click', openTripsModal);
    document.getElementById('brandHomeBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (appState.trips.length > 0) openTripsModal();
    });

    const moreBtn = document.getElementById('btnMoreMenu');
    const moreMenu = document.getElementById('moreDropdown');
    const closeMoreMenu = () => {
      moreMenu?.classList.remove('open');
      moreBtn?.setAttribute('aria-expanded', 'false');
    };
    moreBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = moreMenu.classList.toggle('open');
      moreBtn.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', closeMoreMenu);

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

    // View Mode Tabs
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        appState.viewMode = e.currentTarget.dataset.view;
        saveState();
      });
    });

    // Baggage Filter Strip & Edit Limits (delegation)
    document.getElementById('baggageGrid')?.addEventListener('click', (e) => {
      const limitBtn = e.target.closest('[data-action="open-bag-limits"]');
      if (limitBtn) {
        openBaggageLimitsModal();
        return;
      }
      const bagPill = e.target.closest('[data-baggage-filter]');
      if (bagPill) {
        setBaggageFilter(bagPill.dataset.baggageFilter);
      }
    });

    // Chrono Filter Strip (delegation)
    document.getElementById('chronoFilterStrip')?.addEventListener('click', (e) => {
      const pill = e.target.closest('[data-phase-filter]');
      if (pill) {
        setPhaseFilter(pill.dataset.phaseFilter);
      }
    });

    // IATA Fix All button
    document.getElementById('btnFixAllIata')?.addEventListener('click', fixAllIataConflicts);

    // Toggle All Sections Collapse
    document.getElementById('btnToggleAllSections')?.addEventListener('click', toggleAllSectionsCollapse);

    // Sections Container (delegation: items, inline actions, quick-add, collapse)
    const sectionsContainer = document.getElementById('categorySectionsContainer');
    sectionsContainer?.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        e.stopPropagation();
        const action = actionEl.dataset.action;
        const id = actionEl.dataset.id;
        if (action === 'toggle-item') toggleItem(id);
        else if (action === 'edit-item') openItemModal(id);
        else if (action === 'delete-item') deleteItem(id);
        else if (action === 'qty-inc') adjustItemQty(id, 1);
        else if (action === 'qty-dec') adjustItemQty(id, -1);
        else if (action === 'cycle-baggage') cycleItemBaggage(id);
        else if (action === 'cycle-person') cycleItemPerson(id);
        else if (action === 'fix-iata') fixItemIataConflict(id);
        else if (action === 'toggle-section-check') {
          toggleSectionChecked(actionEl.dataset.sectionType, actionEl.dataset.sectionKey);
        } else if (action === 'prepare-return') {
          prepareReturnMode();
        } else if (action === 'open-bag-limits') {
          openBaggageLimitsModal();
        }
        return;
      }

      if (e.target.closest('.quick-add-row')) return;

      const header = e.target.closest('[data-collapse-key]');
      if (header) {
        toggleSectionCollapse(header.dataset.collapseKey, header);
      }
    });

    sectionsContainer?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.target.closest('[data-action]') || e.target.closest('.quick-add-row')) return;
      const header = e.target.closest('[data-collapse-key]');
      if (!header) return;
      e.preventDefault();
      toggleSectionCollapse(header.dataset.collapseKey, header);
    });

    sectionsContainer?.addEventListener('submit', (e) => {
      const form = e.target.closest('.quick-add-row');
      if (!form) return;
      e.preventDefault();
      handleQuickAddSubmit(form);
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

    // Segmented Status Filter
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

    // Item Modal
    document.getElementById('btnAddItem')?.addEventListener('click', () => openItemModal(null));
    document.getElementById('itemForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      saveItemForm();
    });

    // Trip Modal Form & Delegation
    const tripModal = document.getElementById('tripModal');
    tripModal?.addEventListener('click', (e) => {
      const partyBtn = e.target.closest('[data-party-role]');
      if (partyBtn) {
        adjustParty(partyBtn.dataset.partyRole, parseInt(partyBtn.dataset.delta, 10));
        return;
      }
      const petBtn = e.target.closest('[data-pet-kind]');
      if (petBtn) {
        adjustPet(petBtn.dataset.petKind, parseInt(petBtn.dataset.delta, 10));
        return;
      }
      const daysBtn = e.target.closest('[data-days-delta]');
      if (daysBtn) {
        adjustTripDays(parseInt(daysBtn.dataset.daysDelta, 10));
        return;
      }
      const transportBtn = e.target.closest('[data-transport]');
      if (transportBtn) {
        setTransportSelection(transportBtn.dataset.transport);
        return;
      }
      const seasonBtn = e.target.closest('[data-season]');
      if (seasonBtn) {
        setSeasonSelection(seasonBtn.dataset.season);
        return;
      }
      const tripTypeBtn = e.target.closest('[data-trip-type]');
      if (tripTypeBtn) {
        setTripTypeSelection(tripTypeBtn.dataset.tripType);
        return;
      }
      const actBtn = e.target.closest('[data-activity]');
      if (actBtn) {
        const id = actBtn.dataset.activity;
        if (selectedActivities.has(id)) selectedActivities.delete(id);
        else selectedActivities.add(id);
        renderActivityChips();
        updatePrefillPreview();
      }
    });

    document.getElementById('btnToggleChildrenAccordion')?.addEventListener('click', () => {
      const box = document.getElementById('childrenAccordionBox');
      setChildrenAccordionOpen(!box?.classList.contains('is-open'));
    });

    document.getElementById('partyPetToggle')?.addEventListener('change', (e) => {
      onPetToggleChange(e.target.checked);
    });

    document.getElementById('tripDaysInput')?.addEventListener('input', (e) => {
      onTripDaysInput(e.target.value);
    });

    document.getElementById('tripLaundryToggle')?.addEventListener('change', (e) => {
      selectedLaundry = Boolean(e.target.checked);
      updatePrefillPreview();
    });

    document.getElementById('tripForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      saveTripForm();
    });

    // Country Picker Modal Delegation
    document.getElementById('regionTabsContainer')?.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-region]');
      if (!tab) return;
      currentRegionFilter = tab.dataset.region;
      renderRegionTabs();
      const q = document.getElementById('countrySearchInput')?.value.toLowerCase().trim() || '';
      renderCountryPickerList(currentRegionFilter, q);
    });

    document.getElementById('countryPickerList')?.addEventListener('click', (e) => {
      const item = e.target.closest('[data-country-key]');
      if (item) selectCountry(item.dataset.countryKey);
    });

    // Baggage Limits Modal
    document.getElementById('baggageLimitsForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      saveBaggageLimitsForm();
    });
    document.getElementById('btnScaleBaggageLimits')?.addEventListener('click', scaleBaggageLimitsToParty);
    document.getElementById('btnResetBaggageLimits')?.addEventListener('click', resetBaggageLimitsToDefault);

    // Trips Modal Delegation
    document.getElementById('tripsListContainer')?.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      const id = actionEl.dataset.id;
      if (actionEl.dataset.action === 'select-trip') selectTrip(id);
      else if (actionEl.dataset.action === 'duplicate-trip') duplicateTripById(id);
      else if (actionEl.dataset.action === 'delete-trip') deleteTripById(id);
    });

    document.getElementById('btnNewTripFromSwitcher')?.addEventListener('click', () => {
      closeTripsModal();
      openTripModal(null);
    });

    // Templates Modal Delegation
    document.getElementById('btnTemplates')?.addEventListener('click', openTemplatesModal);
    document.getElementById('btnSaveAsTemplate')?.addEventListener('click', saveCurrentTripAsTemplate);
    document.getElementById('btnCreateBlankTrip')?.addEventListener('click', createBlankTrip);
    document.getElementById('templatesListContainer')?.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      const id = actionEl.dataset.id;
      if (actionEl.dataset.action === 'load-custom-tpl') loadCustomTemplate(id);
      else if (actionEl.dataset.action === 'delete-custom-tpl') deleteCustomTemplate(id);
      else if (actionEl.dataset.action === 'load-default-tpl') loadDefaultTemplate(id);
    });

    // More Menu Actions
    document.getElementById('btnPrepareReturn')?.addEventListener('click', () => {
      closeMoreMenu();
      prepareReturnMode();
    });
    document.getElementById('btnResetAll')?.addEventListener('click', () => {
      closeMoreMenu();
      const trip = getActiveTrip();
      if (!trip) return;
      showConfirm('Nouveau départ', `Décocher tous les articles de « ${trip.name} » ?`, 'Tout décocher', () => {
        trip.items.forEach(i => { i.checked = false; });
        saveState();
        showToast('Checklist réinitialisée');
      });
    });
    document.getElementById('btnShareText')?.addEventListener('click', () => {
      closeMoreMenu();
      shareTripAsText();
    });
    document.getElementById('btnExport')?.addEventListener('click', () => {
      closeMoreMenu();
      exportData();
    });
    document.getElementById('btnImport')?.addEventListener('click', () => {
      closeMoreMenu();
      document.getElementById('importFileInput')?.click();
    });
    document.getElementById('importFileInput')?.addEventListener('change', importData);
    document.getElementById('btnPrint')?.addEventListener('click', () => {
      closeMoreMenu();
      if (!getActiveTrip()) return;
      window.print();
    });
    document.getElementById('btnCheckUpdate')?.addEventListener('click', () => {
      closeMoreMenu();
      checkForAppUpdates(true);
    });
    document.getElementById('btnOtherApps')?.addEventListener('click', () => {
      closeMoreMenu();
      openOtherAppsModal();
    });

    // Update Modal
    document.getElementById('updateDismissBtn')?.addEventListener('click', dismissUpdate);
    document.getElementById('updateDownloadBtn')?.addEventListener('click', downloadAndInstallUpdate);
    document.getElementById('updateWebRefreshBtn')?.addEventListener('click', refreshWebAppFromGit);

    // Confirm Modal
    document.getElementById('confirmCancelBtn')?.addEventListener('click', closeConfirmModal);
    document.getElementById('confirmOkBtn')?.addEventListener('click', () => {
      if (confirmCallback) confirmCallback();
      closeConfirmModal();
    });

    // Close Modal Buttons & Backdrop Click
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById(btn.dataset.closeModal)?.classList.remove('open');
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          if (overlay.id === 'confirmModal') closeConfirmModal();
          else overlay.classList.remove('open');
        }
      });
    });

    // Keyboard Escape closes dropdown or top-most modal
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (moreMenu?.classList.contains('open')) {
        closeMoreMenu();
        return;
      }
      const openModals = Array.from(document.querySelectorAll('.modal-overlay.open'));
      if (openModals.length > 0) {
        const topModal = openModals[openModals.length - 1];
        if (topModal.id === 'confirmModal') closeConfirmModal();
        else topModal.classList.remove('open');
      }
    });
  }

  // === COMPTE À REBOURS & PHASE SUGGÉRÉE ===
  function getCountdownInfo(departureDateStr, days = 3) {
    if (!departureDateStr) return null;
    const clean = sanitizeDateStr(departureDateStr);
    if (!clean) return null;
    const [y, m, d] = clean.split('-').map(Number);
    const depDate = new Date(y, m - 1, d);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((depDate.getTime() - today.getTime()) / 86400000);

    if (diffDays > 180) {
      return { label: `J-${diffDays}`, variant: '', suggestedPhase: 'phase_6months' };
    }
    if (diffDays > 7) {
      return { label: `J-${diffDays}`, variant: '', suggestedPhase: 'phase_prep' };
    }
    if (diffDays > 1) {
      return { label: `J-${diffDays}`, variant: 'is-soon', suggestedPhase: 'phase_pack' };
    }
    if (diffDays === 1) {
      return { label: 'Demain (J-1)', variant: 'is-soon', suggestedPhase: 'phase_pack' };
    }
    if (diffDays === 0) {
      return { label: 'Jour J !', variant: 'is-today', suggestedPhase: 'phase_departure' };
    }
    const elapsed = Math.abs(diffDays);
    if (elapsed <= Math.max(1, Number(days) || 3)) {
      return { label: `En voyage (J+${elapsed})`, variant: 'is-ongoing', suggestedPhase: 'phase_return' };
    }
    return { label: 'Retour effectué', variant: '', suggestedPhase: 'phase_return' };
  }

  // === RÈGLES IATA ===
  function getIataConflict(item, isPlane) {
    if (!isPlane || !item.iata) return null;
    if (item.iata === 'cabin-only' && item.baggage === 'soute') return 'must-cabin';
    if (item.iata === 'hold-only' && item.baggage !== 'soute') return 'must-hold';
    return null;
  }

  function fixItemIataConflict(itemId) {
    const trip = getActiveTrip();
    if (!trip) return;
    const item = trip.items.find(i => i.id === itemId);
    if (!item) return;

    const conflict = getIataConflict(item, trip.transport === 'avion');
    if (!conflict) return;

    if (conflict === 'must-cabin') {
      item.baggage = trip.baggages.cabine ? 'cabine' : (trip.baggages.daypack ? 'daypack' : 'porte');
      const targetName = trip.baggages[item.baggage]?.name || 'Cabine';
      saveState();
      showToast(`« ${item.name} » déplacé vers ${targetName}`);
    } else if (conflict === 'must-hold') {
      item.baggage = trip.baggages.soute ? 'soute' : Object.keys(trip.baggages)[0];
      const targetName = trip.baggages[item.baggage]?.name || 'Soute';
      saveState();
      showToast(`« ${item.name} » déplacé vers ${targetName}`);
    }
  }

  function fixAllIataConflicts() {
    const trip = getActiveTrip();
    if (!trip || trip.transport !== 'avion') return;
    let fixed = 0;
    trip.items.forEach(item => {
      const conflict = getIataConflict(item, true);
      if (conflict === 'must-cabin') {
        item.baggage = trip.baggages.cabine ? 'cabine' : (trip.baggages.daypack ? 'daypack' : 'porte');
        fixed++;
      } else if (conflict === 'must-hold') {
        item.baggage = trip.baggages.soute ? 'soute' : Object.keys(trip.baggages)[0];
        fixed++;
      }
    });
    if (fixed > 0) {
      saveState();
      showToast(`${fixed} conflit${fixed > 1 ? 's' : ''} IATA corrigé${fixed > 1 ? 's' : ''}`);
    }
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
        const headerLeft = switcherBtn.closest('.header-left');
        if (appState.trips.length > 0) {
          switcherBtn.style.display = 'inline-flex';
          switcherLabel.textContent = `${appState.trips.length} voyage${appState.trips.length > 1 ? 's' : ''}`;
          switcherBtn.title = 'Changer de voyage';
          headerLeft?.classList.add('has-switcher');
        } else {
          switcherBtn.style.display = 'none';
          switcherBtn.removeAttribute('title');
          headerLeft?.classList.remove('has-switcher');
        }
      }
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (activeEl) activeEl.style.display = 'block';
    if (switcherBtn) {
      switcherBtn.style.display = 'inline-flex';
      switcherLabel.textContent = trip.name;
      switcherBtn.title = trip.name;
      switcherBtn.closest('.header-left')?.classList.add('has-switcher');
    }

    document.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === appState.viewMode);
    });

    // Synchroniser les onglets de filtre statut
    document.querySelectorAll('.segment').forEach(btn => {
      const active = btn.dataset.filter === appState.filterStatus;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
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

    document.getElementById('heroFlag').innerHTML = getCountryFlagSvg(trip.countryKey);
    document.getElementById('heroTitle').textContent = trip.name;

    const tripDays = Math.max(1, Number(trip.days) || tType.duration || 3);
    const countdown = getCountdownInfo(trip.departureDate, tripDays);
    const countdownEl = document.getElementById('heroCountdown');
    if (countdownEl) {
      if (countdown) {
        countdownEl.style.display = 'inline-flex';
        countdownEl.className = `hero-countdown-badge ${countdown.variant}`.trim();
        countdownEl.textContent = countdown.label;
      } else {
        countdownEl.style.display = 'none';
      }
    }

    const parts = [
      country.name,
      formatPartySummary(trip.party, { petMode: 'short' }),
      `${tripDays} jour${tripDays > 1 ? 's' : ''}${trip.laundry ? ' (lessive)' : ''}`,
      trans.label,
      season.label.split('/')[0].trim()
    ].filter(Boolean);

    document.getElementById('heroMeta').textContent = parts.join(' · ');

    // Progression globale
    const totalCount = trip.items.length;
    const totalChecked = trip.items.filter(i => i.checked).length;
    const pctGlobal = totalCount > 0 ? Math.round((totalChecked / totalCount) * 100) : 0;

    document.getElementById('globalProgressText').textContent = `${totalChecked} / ${totalCount} préparés (${pctGlobal}%)`;
    document.getElementById('globalWeightText').textContent = `${formatWeightKg(getAllWeight(trip), 2)} kg`;

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

    // Règle IATA avion + détection des conflits
    const iataEl = document.getElementById('iataCallout');
    const iataTextEl = document.getElementById('iataCalloutText');
    const fixAllBtn = document.getElementById('btnFixAllIata');
    if (iataEl && iataTextEl) {
      if (trans.showIata) {
        const conflictCount = trip.items.filter(it => getIataConflict(it, true) !== null).length;
        iataEl.style.display = 'flex';
        iataEl.classList.toggle('is-alert', conflictCount > 0);
        if (conflictCount > 0) {
          iataTextEl.innerHTML = `<strong>${conflictCount} conflit${conflictCount > 1 ? 's' : ''} bagage IATA détecté${conflictCount > 1 ? 's' : ''} :</strong> certains articles sont dans un bagage interdit en avion.`;
          if (fixAllBtn) fixAllBtn.style.display = 'inline-flex';
        } else {
          iataTextEl.innerHTML = `<strong>Règle avion :</strong> Batteries externes &amp; objets de valeur en <u>cabine</u> ; couteaux &amp; liquides &gt; 100 ml en <u>soute</u>.`;
          if (fixAllBtn) fixAllBtn.style.display = 'none';
        }
      } else {
        iataEl.style.display = 'none';
      }
    }
  }

  function calculateWeights(trip) {
    const result = {};
    for (const key of Object.keys(trip.baggages)) {
      result[key] = { current: 0, checkedWeight: 0, count: 0, checkedCount: 0 };
    }
    result.porte = { current: 0, checkedWeight: 0, count: 0, checkedCount: 0 };

    trip.items.forEach(item => {
      const bKey = item.baggage || getDefaultBaggageKey(trip.baggages);
      if (!result[bKey]) result[bKey] = { current: 0, checkedWeight: 0, count: 0, checkedCount: 0 };
      const w = (Number(item.weight) || 0) * (Number(item.qty) || 1);
      result[bKey].current += w;
      result[bKey].count++;
      if (item.checked) {
        result[bKey].checkedCount++;
        result[bKey].checkedWeight += w;
      }
    });

    return result;
  }

  function getAllWeight(trip) {
    return trip.items.reduce((sum, item) => sum + ((Number(item.weight) || 0) * (Number(item.qty) || 1)), 0);
  }

  function getAllCheckedWeight(trip) {
    return trip.items.reduce((sum, item) => sum + (item.checked ? ((Number(item.weight) || 0) * (Number(item.qty) || 1)) : 0), 0);
  }

  // === BANDES DE FILTRES : BAGAGES ET CHRONO ===
  function renderBaggageStrip(trip) {
    const strip = document.getElementById('baggageGrid');
    if (!strip) return;

    const weights = calculateWeights(trip);
    const isAll = appState.filterBaggage === 'all';
    const totalKg = formatWeightKg(getAllWeight(trip), 1);
    const totalCheckedKg = formatWeightKg(getAllCheckedWeight(trip), 1);

    let html = `
      <button type="button" class="bag-pill ${isAll ? 'active' : ''}" data-baggage-filter="all">
        <div class="bag-pill-top">
          <span>Tous</span>
          <span class="bag-pill-weight">${totalKg} kg</span>
        </div>
        <div class="bag-pill-bar">
          <div class="bag-pill-fill" style="width: 100%"></div>
        </div>
        <div class="bag-pill-sub">
          <span>Préparé : ${totalCheckedKg} kg</span>
        </div>
      </button>
    `;

    for (const [key, bag] of Object.entries(trip.baggages)) {
      const bData = weights[key] || { current: 0, checkedWeight: 0 };
      const curKg = formatWeightKg(bData.current, 1);
      const checkedKg = formatWeightKg(bData.checkedWeight, 1);
      const limitKg = (bag.limit / 1000).toFixed(bag.limit % 1000 === 0 ? 0 : 1);
      const pct = bag.limit > 0 ? Math.min(100, Math.round((bData.current / bag.limit) * 100)) : 0;
      const diffGrams = bag.limit - bData.current;
      const marginText = diffGrams >= 0
        ? `Reste ${formatWeightKg(diffGrams, 1)} kg`
        : `+${formatWeightKg(Math.abs(diffGrams), 1)} kg !`;
      const marginClass = diffGrams >= 0 ? 'ok' : 'over';

      let fillClass = '';
      if (pct >= 100) fillClass = 'danger';
      else if (pct >= 85) fillClass = 'warning';

      const isActive = appState.filterBaggage === key;
      html += `
        <button type="button" class="bag-pill ${isActive ? 'active' : ''}" data-baggage-filter="${escapeHtml(key)}">
          <div class="bag-pill-top">
            <span>${escapeHtml(bag.name)}</span>
            <span class="bag-pill-weight">${curKg}/${limitKg} kg</span>
          </div>
          <div class="bag-pill-bar">
            <div class="bag-pill-fill ${fillClass}" style="width: ${pct}%"></div>
          </div>
          <div class="bag-pill-sub">
            <span>Prêt : ${checkedKg} kg</span>
            <span class="bag-pill-margin ${marginClass}">${marginText}</span>
          </div>
        </button>
      `;
    }

    const porteData = weights.porte || { current: 0, checkedWeight: 0, count: 0 };
    if (porteData.count > 0 || appState.filterBaggage === 'porte') {
      const porteKg = formatWeightKg(porteData.current, 1);
      const porteCheckedKg = formatWeightKg(porteData.checkedWeight, 1);
      const portePct = porteData.count > 0 ? Math.round((porteData.checkedCount / porteData.count) * 100) : 0;
      const isPorteActive = appState.filterBaggage === 'porte';
      html += `
        <button type="button" class="bag-pill ${isPorteActive ? 'active' : ''}" data-baggage-filter="porte">
          <div class="bag-pill-top">
            <span>Sur soi</span>
            <span class="bag-pill-weight">${porteKg} kg</span>
          </div>
          <div class="bag-pill-bar">
            <div class="bag-pill-fill" style="width: ${portePct}%"></div>
          </div>
          <div class="bag-pill-sub">
            <span>Prêt : ${porteCheckedKg} kg</span>
            <span class="bag-pill-margin ok">${porteData.count} art.</span>
          </div>
        </button>
      `;
    }

    html += `
      <button type="button" class="bag-edit-limits-btn" data-action="open-bag-limits" title="Modifier les limites de poids">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M5 8h14"/><path d="M3 16h4l-2-6-2 6Z"/><path d="M17 16h4l-2-6-2 6Z"/></svg>
        <span>Limites</span>
      </button>
    `;

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

    const countdown = getCountdownInfo(trip.departureDate, trip.days);
    const suggestedPhase = countdown?.suggestedPhase || '';

    const isAll = appState.filterPhase === 'all';
    let html = `
      <button type="button" class="chrono-tab-pill ${isAll ? 'active' : ''}" data-phase-filter="all">
        <span>Toutes les étapes</span>
        <span class="pill-count">${trip.items.length}</span>
      </button>
    `;

    for (const [pKey, phase] of Object.entries(CHRONO_PHASES)) {
      const phaseItems = trip.items.filter(i => i.phase === pKey);
      const checked = phaseItems.filter(i => i.checked).length;
      const isActive = appState.filterPhase === pKey;
      const isDone = phaseItems.length > 0 && checked === phaseItems.length;
      const isSuggested = suggestedPhase === pKey && !isDone;

      html += `
        <button type="button" class="chrono-tab-pill ${isActive ? 'active' : ''} ${isDone ? 'done' : ''} ${isSuggested ? 'is-suggested' : ''}" data-phase-filter="${escapeHtml(pKey)}" style="--phase-color: ${escapeHtml(phase.color)}" ${isSuggested ? 'title="Étape recommandée selon votre date de départ"' : ''}>
          <span class="pill-dot" style="background: ${escapeHtml(phase.color)}"></span>
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
  function getFilteredItems(trip) {
    return trip.items.filter(item => {
      if (appState.viewMode === 'chrono' && appState.filterPhase !== 'all' && item.phase !== appState.filterPhase) {
        return false;
      }
      if (appState.filterBaggage !== 'all' && item.baggage !== appState.filterBaggage) {
        return false;
      }
      if (appState.filterStatus === 'todo' && item.checked) return false;
      if (appState.filterStatus === 'done' && !item.checked) return false;
      if (appState.searchQuery) {
        const matchName = item.name.toLowerCase().includes(appState.searchQuery);
        const matchNote = (item.note || '').toLowerCase().includes(appState.searchQuery);
        const matchCat = (CATEGORIES[item.cat]?.name || '').toLowerCase().includes(appState.searchQuery);
        if (!matchName && !matchNote && !matchCat) return false;
      }
      return true;
    });
  }

  function renderList(trip = getActiveTrip()) {
    const container = document.getElementById('categorySectionsContainer');
    if (!container || !trip) return;

    const filtered = getFilteredItems(trip);

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

    if (appState.viewMode === 'chrono') {
      renderChronoView(container, filtered, trip, isPlane);
    } else if (appState.viewMode === 'baggage') {
      renderBaggageView(container, filtered, trip, isPlane);
    } else if (appState.viewMode === 'person') {
      renderPersonView(container, filtered, trip, isPlane);
    } else {
      renderCategoryView(container, filtered, trip, isPlane);
    }
  }

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

  function toggleAllSectionsCollapse() {
    const headers = Array.from(document.querySelectorAll('#categorySectionsContainer [data-collapse-key]'));
    if (headers.length === 0) return;

    const anyExpanded = headers.some(h => !h.closest('section')?.classList.contains('is-collapsed'));
    if (!appState.collapsedSections || typeof appState.collapsedSections !== 'object') {
      appState.collapsedSections = {};
    }

    headers.forEach(h => {
      const key = h.dataset.collapseKey;
      const card = h.closest('section');
      if (anyExpanded) {
        appState.collapsedSections[key] = true;
        card?.classList.add('is-collapsed');
        h.setAttribute('aria-expanded', 'false');
      } else {
        delete appState.collapsedSections[key];
        card?.classList.remove('is-collapsed');
        h.setAttribute('aria-expanded', 'true');
      }
    });

    saveState(false);
    showToast(anyExpanded ? 'Sections repliées' : 'Sections dépliées');
  }

  function renderQuickAddRow(sectionType, sectionKey, placeholder) {
    return `
      <form class="quick-add-row" data-quick-add-type="${escapeHtml(sectionType)}" data-quick-add-key="${escapeHtml(sectionKey)}">
        <input type="text" class="quick-add-input" placeholder="${escapeHtml(placeholder)}" aria-label="${escapeHtml(placeholder)}">
        <button type="submit" class="quick-add-btn" title="Ajouter" aria-label="Ajouter">+</button>
      </form>
    `;
  }

  function handleQuickAddSubmit(form) {
    const trip = getActiveTrip();
    if (!trip) return;
    const input = form.querySelector('.quick-add-input');
    const name = sanitizeText(input?.value, 160);
    if (!name) return;

    const secType = form.dataset.quickAddType;
    const secKey = form.dataset.quickAddKey;

    let phase = (appState.viewMode === 'chrono' && appState.filterPhase !== 'all') ? appState.filterPhase : 'phase_pack';
    let baggage = appState.filterBaggage !== 'all' ? appState.filterBaggage : getDefaultBaggageKey(trip.baggages);
    let cat = 'practical';
    let person = 'shared';

    if (secType === 'chrono' && CHRONO_PHASES[secKey]) phase = secKey;
    else if (secType === 'bag' && (secKey === 'porte' || trip.baggages[secKey])) baggage = secKey;
    else if (secType === 'cat' && CATEGORIES[secKey]) cat = secKey;
    else if (secType === 'person' && typeof PERSON_GROUPS !== 'undefined' && PERSON_GROUPS[secKey]) person = secKey;

    trip.items.push({
      id: 'custom_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name,
      note: '',
      phase,
      cat,
      baggage,
      person,
      custom: true,
      qty: 1,
      weight: 0,
      iata: '',
      checked: false
    });

    input.value = '';
    saveState();
    showToast(`« ${name} » ajouté`);
  }

  function toggleSectionChecked(sectionType, sectionKey) {
    const trip = getActiveTrip();
    if (!trip) return;

    const filtered = getFilteredItems(trip);
    const matching = filtered.filter(item => {
      if (sectionType === 'chrono') return (item.phase || 'phase_pack') === sectionKey;
      if (sectionType === 'bag') return (item.baggage || 'porte') === sectionKey;
      if (sectionType === 'cat') return (item.cat || 'practical') === sectionKey;
      if (sectionType === 'person') return (item.person || 'shared') === sectionKey;
      return false;
    });

    if (matching.length === 0) return;
    const allChecked = matching.every(i => i.checked);
    const targetVal = !allChecked;
    matching.forEach(i => { i.checked = targetVal; });

    saveState();
    showToast(targetVal ? `${matching.length} article(s) coché(s)` : `${matching.length} article(s) décoché(s)`);
  }

  // 1. Vue Chronologique
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
        <section class="chrono-section-card ${isDone ? 'is-complete' : ''} ${isCollapsed ? 'is-collapsed' : ''}" id="chrono-sec-${escapeHtml(pKey)}">
          <div class="chrono-section-header" data-collapse-key="${escapeHtml(collapseKey)}" role="button" tabindex="0" aria-expanded="${!isCollapsed}" aria-controls="chrono-list-${escapeHtml(pKey)}" style="--section-accent: ${escapeHtml(phase.color)}; --section-accent-bg: ${escapeHtml(phase.badgeBg)}">
            <div class="chrono-header-left">
              <div class="chrono-icon-badge" style="color: ${escapeHtml(phase.color)}; background: ${escapeHtml(phase.badgeBg)};">
                ${phase.iconSvg}
              </div>
              <div>
                <div class="chrono-title-row">
                  <span class="chrono-timing-badge" style="background: ${escapeHtml(phase.badgeBg)}; color: ${escapeHtml(phase.color)}">${escapeHtml(phase.timing)}</span>
                  <h3 class="chrono-title">${escapeHtml(phase.title)}</h3>
                </div>
                <p class="chrono-subtitle">${escapeHtml(phase.subtitle)}</p>
              </div>
            </div>
            <div class="chrono-header-right">
              ${pKey === 'phase_return' ? `<button type="button" class="section-inline-action-btn" data-action="prepare-return" title="Décocher la valise pour préparer le retour">Remballer</button>` : ''}
              <button type="button" class="section-check-all-btn ${isDone ? 'is-all-done' : ''}" data-action="toggle-section-check" data-section-type="chrono" data-section-key="${escapeHtml(pKey)}" title="${isDone ? 'Tout décocher' : 'Tout cocher'}" aria-label="${isDone ? 'Tout décocher dans ' + escapeHtml(phase.title) : 'Tout cocher dans ' + escapeHtml(phase.title)}">
                ${SVG_CHECK_ALL}
              </button>
              <div class="chrono-header-stats">
                <span class="chrono-count-badge ${isDone ? 'done' : ''}">${checkedCount}/${list.length}</span>
                <div class="chrono-mini-bar">
                  <div class="chrono-mini-bar-fill" style="width: ${pct}%; background: ${escapeHtml(phase.color)}"></div>
                </div>
              </div>
              ${COLLAPSE_CHEVRON_SVG}
            </div>
          </div>
          <ul class="item-list" id="chrono-list-${escapeHtml(pKey)}">
            ${list.map(item => renderItemRow(item, trip, isPlane)).join('')}
          </ul>
          ${renderQuickAddRow('chrono', pKey, `+ Ajouter dans « ${phase.title} »...`)}
        </section>
      `;
    }

    container.innerHTML = html;
  }

  // 2. Vue par Bagages
  function renderBaggageView(container, items, trip, isPlane) {
    const bagOrder = [...Object.keys(trip.baggages), 'porte'];
    const grouped = {};
    bagOrder.forEach(k => { grouped[k] = []; });

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
      const totalGrams = list.reduce((sum, i) => sum + ((i.weight || 0) * (i.qty || 1)), 0);
      const bWeightKg = (totalGrams / 1000).toFixed(2);
      const bagLimit = trip.baggages[bKey]?.limit;
      const limitStr = bagLimit ? ` / ${(bagLimit / 1000).toFixed(bagLimit % 1000 === 0 ? 0 : 1)} kg` : '';
      const collapseKey = `bag:${bKey}`;
      const isCollapsed = isSectionCollapsed(collapseKey);

      html += `
        <section class="category-card ${isCollapsed ? 'is-collapsed' : ''}" id="bag-sec-${escapeHtml(bKey)}">
          <div class="category-header" data-collapse-key="${escapeHtml(collapseKey)}" role="button" tabindex="0" aria-expanded="${!isCollapsed}" aria-controls="bag-list-${escapeHtml(bKey)}">
            <div class="category-title">
              <span>${escapeHtml(bName)}</span>
              <span style="font-size: 0.8rem; font-weight: 500; color: var(--text-muted);">· ${bWeightKg} kg${limitStr}</span>
            </div>
            <div class="category-header-right">
              ${bKey !== 'porte' ? `<button type="button" class="section-inline-action-btn" data-action="open-bag-limits" title="Modifier la franchise">Limites</button>` : ''}
              <button type="button" class="section-check-all-btn ${isDone ? 'is-all-done' : ''}" data-action="toggle-section-check" data-section-type="bag" data-section-key="${escapeHtml(bKey)}" title="${isDone ? 'Tout décocher' : 'Tout cocher'}" aria-label="${isDone ? 'Tout décocher' : 'Tout cocher'}">
                ${SVG_CHECK_ALL}
              </button>
              <span class="category-count ${isDone ? 'done' : ''}">${checkedCount}/${list.length}</span>
              ${COLLAPSE_CHEVRON_SVG}
            </div>
          </div>
          <ul class="item-list" id="bag-list-${escapeHtml(bKey)}">
            ${list.map(item => renderItemRow(item, trip, isPlane)).join('')}
          </ul>
          ${renderQuickAddRow('bag', bKey, `+ Ajouter dans « ${bName} »...`)}
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
        <section class="category-card ${isCollapsed ? 'is-collapsed' : ''}" id="cat-sec-${escapeHtml(catKey)}">
          <div class="category-header" data-collapse-key="${escapeHtml(collapseKey)}" role="button" tabindex="0" aria-expanded="${!isCollapsed}" aria-controls="cat-list-${escapeHtml(catKey)}">
            <div class="category-title">
              <span class="cat-svg-icon">${catInfo.iconSvg}</span>
              <span>${escapeHtml(catInfo.name)}</span>
            </div>
            <div class="category-header-right">
              <button type="button" class="section-check-all-btn ${isDone ? 'is-all-done' : ''}" data-action="toggle-section-check" data-section-type="cat" data-section-key="${escapeHtml(catKey)}" title="${isDone ? 'Tout décocher' : 'Tout cocher'}" aria-label="${isDone ? 'Tout décocher' : 'Tout cocher'}">
                ${SVG_CHECK_ALL}
              </button>
              <span class="category-count ${isDone ? 'done' : ''}">${checkedCount}/${list.length}</span>
              ${COLLAPSE_CHEVRON_SVG}
            </div>
          </div>
          <ul class="item-list" id="cat-list-${escapeHtml(catKey)}">
            ${list.map(item => renderItemRow(item, trip, isPlane)).join('')}
          </ul>
          ${renderQuickAddRow('cat', catKey, `+ Ajouter dans « ${catInfo.name} »...`)}
        </section>
      `;
    }

    container.innerHTML = html;
  }

  // 4. Vue par Personne
  function renderPersonView(container, items, trip, isPlane) {
    const personOrder = ['adult', 'child', 'pet', 'shared'];
    const grouped = { adult: [], child: [], pet: [], shared: [] };

    items.forEach(item => {
      const pKey = (typeof PERSON_GROUPS !== 'undefined' && PERSON_GROUPS[item.person]) ? item.person : 'shared';
      grouped[pKey].push(item);
    });

    let html = '';
    for (const pKey of personOrder) {
      const list = grouped[pKey] || [];
      if (list.length === 0) continue;

      const pInfo = PERSON_GROUPS[pKey];
      const checkedCount = list.filter(i => i.checked).length;
      const isDone = checkedCount === list.length;
      const totalGrams = list.reduce((sum, i) => sum + ((i.weight || 0) * (i.qty || 1)), 0);
      const pWeightKg = (totalGrams / 1000).toFixed(2);
      const collapseKey = `person:${pKey}`;
      const isCollapsed = isSectionCollapsed(collapseKey);

      html += `
        <section class="category-card ${isCollapsed ? 'is-collapsed' : ''}" id="person-sec-${escapeHtml(pKey)}">
          <div class="category-header" data-collapse-key="${escapeHtml(collapseKey)}" role="button" tabindex="0" aria-expanded="${!isCollapsed}" aria-controls="person-list-${escapeHtml(pKey)}">
            <div class="category-title">
              <span class="person-svg-icon" style="color: ${escapeHtml(pInfo.color)}; background: ${escapeHtml(pInfo.badgeBg)};">${pInfo.iconSvg}</span>
              <span>${escapeHtml(pInfo.label)}</span>
              <span style="font-size: 0.8rem; font-weight: 500; color: var(--text-muted);">· ${pWeightKg} kg</span>
            </div>
            <div class="category-header-right">
              <button type="button" class="section-check-all-btn ${isDone ? 'is-all-done' : ''}" data-action="toggle-section-check" data-section-type="person" data-section-key="${escapeHtml(pKey)}" title="${isDone ? 'Tout décocher' : 'Tout cocher'}" aria-label="${isDone ? 'Tout décocher' : 'Tout cocher'}">
                ${SVG_CHECK_ALL}
              </button>
              <span class="category-count ${isDone ? 'done' : ''}">${checkedCount}/${list.length}</span>
              ${COLLAPSE_CHEVRON_SVG}
            </div>
          </div>
          <ul class="item-list" id="person-list-${escapeHtml(pKey)}">
            ${list.map(item => renderItemRow(item, trip, isPlane)).join('')}
          </ul>
          ${renderQuickAddRow('person', pKey, `+ Ajouter pour « ${pInfo.label} »...`)}
        </section>
      `;
    }

    container.innerHTML = html;
  }

  // Rendu d'une ligne d'article
  function renderItemRow(item, trip, isPlane) {
    const safeId = escapeHtml(item.id);
    const bagName = trip.baggages[item.baggage]?.name || (item.baggage === 'porte' ? 'Sur soi' : item.baggage);
    const phaseInfo = CHRONO_PHASES[item.phase] || CHRONO_PHASES.phase_pack;
    const conflict = getIataConflict(item, isPlane);

    let iataBadge = '';
    if (isPlane) {
      if (conflict === 'must-cabin') {
        iataBadge = `<button type="button" class="tag-iata-conflict" data-action="fix-iata" data-id="${safeId}" title="Déplacer en cabine">Interdit en soute · Mettre en cabine</button>`;
      } else if (conflict === 'must-hold') {
        iataBadge = `<button type="button" class="tag-iata-conflict" data-action="fix-iata" data-id="${safeId}" title="Déplacer en soute">Interdit en cabine · Mettre en soute</button>`;
      } else if (item.iata === 'cabin-only') {
        iataBadge = `<span class="tag-iata tag-cabin">Cabine seule</span>`;
      } else if (item.iata === 'hold-only') {
        iataBadge = `<span class="tag-iata tag-hold">Soute seule</span>`;
      }
    }

    const weightStr = item.weight ? `${item.weight * (item.qty || 1)} g` : '';
    const qtyHtml = item.qty > 1
      ? `<span class="qty-pill-group">
           <button type="button" class="qty-mini-btn" data-action="qty-dec" data-id="${safeId}" title="Diminuer" aria-label="Diminuer quantité">−</button>
           <span class="item-qty tabular-nums">×${item.qty}</span>
           <button type="button" class="qty-mini-btn" data-action="qty-inc" data-id="${safeId}" title="Augmenter" aria-label="Augmenter quantité">+</button>
         </span>`
      : '';

    const personKey = (typeof PERSON_GROUPS !== 'undefined' && PERSON_GROUPS[item.person]) ? item.person : 'shared';
    const personInfo = (typeof PERSON_GROUPS !== 'undefined') ? PERSON_GROUPS[personKey] : null;
    const showPersonBadge = personInfo && (personKey !== 'shared' || appState.viewMode === 'person');
    const personBadgeHtml = showPersonBadge
      ? `<button type="button" class="tag-person-btn" data-action="cycle-person" data-id="${safeId}" title="Changer l'attribution voyageur" style="--person-color: ${escapeHtml(personInfo.color)}; --person-bg: ${escapeHtml(personInfo.badgeBg)}">${escapeHtml(personInfo.shortLabel)}</button>`
      : '';

    return `
      <li class="item-row ${item.checked ? 'checked' : ''} ${conflict ? 'has-iata-conflict' : ''}" id="row-${safeId}">
        <button type="button" class="item-checkbox ${item.checked ? 'checked' : ''}" data-action="toggle-item" data-id="${safeId}" aria-label="Cocher ${escapeHtml(item.name)}">
          ${item.checked ? SVG_CHECK : ''}
        </button>
        <div class="item-body" data-action="toggle-item" data-id="${safeId}">
          <div class="item-title-line">
            <span class="item-name">${escapeHtml(item.name)}</span>
            ${qtyHtml}
          </div>
          ${item.note ? `<p class="item-note">${escapeHtml(item.note)}</p>` : ''}
          <div class="item-sub">
            <button type="button" class="tag-baggage-btn" data-action="cycle-baggage" data-id="${safeId}" title="Changer de bagage">${escapeHtml(bagName)}</button>
            <span class="tag-phase" style="--p-color: ${escapeHtml(phaseInfo.color)}; --p-bg: ${escapeHtml(phaseInfo.badgeBg)}">${escapeHtml(phaseInfo.shortLabel)}</span>
            ${personBadgeHtml}
            ${iataBadge}
          </div>
        </div>
        <div class="item-right">
          ${weightStr ? `<span class="item-weight">${weightStr}</span>` : ''}
          <div class="item-actions">
            <button type="button" class="icon-btn icon-btn-subtle" data-action="edit-item" data-id="${safeId}" title="Modifier" aria-label="Modifier">${SVG_EDIT}</button>
            <button type="button" class="icon-btn icon-btn-subtle icon-btn-danger" data-action="delete-item" data-id="${safeId}" title="Supprimer" aria-label="Supprimer">${SVG_TRASH}</button>
          </div>
        </div>
      </li>
    `;
  }

  // === ACTIONS SUR LES ARTICLES ===
  function toggleItem(id) {
    const trip = getActiveTrip();
    const item = trip?.items.find(i => i.id === id);
    if (!item) return;

    item.checked = !item.checked;
    if (navigator.vibrate) {
      try { navigator.vibrate(15); } catch (e) {}
    }

    if (appState.filterStatus !== 'all') {
      saveState();
      return;
    }

    // Mise à jour ciblée sans détruire le DOM pour garder la fluidité et le focus
    saveState(false);
    const row = document.getElementById(`row-${item.id}`);
    if (row) {
      row.classList.toggle('checked', item.checked);
      const cb = row.querySelector('.item-checkbox');
      if (cb) {
        cb.classList.toggle('checked', item.checked);
        cb.innerHTML = item.checked ? SVG_CHECK : '';
      }
      const section = row.closest('section');
      if (section) {
        const allRows = Array.from(section.querySelectorAll('.item-row'));
        const checkedInSec = allRows.filter(r => r.classList.contains('checked')).length;
        const totalInSec = allRows.length;
        const isSecDone = totalInSec > 0 && checkedInSec === totalInSec;

        section.classList.toggle('is-complete', isSecDone);
        const chronoBadge = section.querySelector('.chrono-count-badge');
        if (chronoBadge) {
          chronoBadge.textContent = `${checkedInSec}/${totalInSec}`;
          chronoBadge.classList.toggle('done', isSecDone);
        }
        const miniBarFill = section.querySelector('.chrono-mini-bar-fill');
        if (miniBarFill && totalInSec > 0) {
          miniBarFill.style.width = `${Math.round((checkedInSec / totalInSec) * 100)}%`;
        }
        const catCount = section.querySelector('.category-count');
        if (catCount) {
          catCount.textContent = `${checkedInSec}/${totalInSec}`;
          catCount.classList.toggle('done', isSecDone);
        }
        const checkAllBtn = section.querySelector('.section-check-all-btn');
        if (checkAllBtn) {
          checkAllBtn.classList.toggle('is-all-done', isSecDone);
        }
      }
    }

    renderTripHeader(trip);
    renderBaggageStrip(trip);
    renderChronoFilterStrip(trip);
  }

  function adjustItemQty(id, delta) {
    const trip = getActiveTrip();
    const item = trip?.items.find(i => i.id === id);
    if (!item) return;
    item.qty = Math.max(1, Math.min(999, (Number(item.qty) || 1) + delta));
    saveState();
  }

  function cycleItemBaggage(id) {
    const trip = getActiveTrip();
    const item = trip?.items.find(i => i.id === id);
    if (!trip || !item) return;

    const order = [...Object.keys(trip.baggages), 'porte'];
    const currentIdx = order.indexOf(item.baggage);
    const nextKey = order[(currentIdx + 1) % order.length];
    item.baggage = nextKey;

    const nextLabel = trip.baggages[nextKey]?.name || 'Sur soi / Poches';
    saveState();
    showToast(`Déplacé vers « ${nextLabel} »`);
  }

  function cycleItemPerson(id) {
    const trip = getActiveTrip();
    const item = trip?.items.find(i => i.id === id);
    if (!trip || !item || typeof PERSON_GROUPS === 'undefined') return;

    const order = ['shared', 'adult', 'child', 'pet'];
    const currentIdx = order.indexOf(item.person || 'shared');
    const nextKey = order[(currentIdx + 1) % order.length];
    item.person = nextKey;

    saveState();
    showToast(`Attribué à « ${PERSON_GROUPS[nextKey].label} »`);
  }

  function deleteItem(id) {
    const trip = getActiveTrip();
    if (!trip) return;
    const index = trip.items.findIndex(i => i.id === id);
    if (index === -1) return;

    const deletedCopy = JSON.parse(JSON.stringify(trip.items[index]));
    trip.items.splice(index, 1);
    saveState();

    showToast(`« ${deletedCopy.name} » retiré`, {
      actionLabel: 'Annuler',
      onAction: () => {
        const currentTrip = appState.trips.find(t => t.id === trip.id);
        if (!currentTrip) return;
        if (!currentTrip.items.some(i => i.id === deletedCopy.id)) {
          currentTrip.items.splice(Math.min(index, currentTrip.items.length), 0, deletedCopy);
          saveState();
          showToast('Article restauré');
        }
      }
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
        <option value="${escapeHtml(k)}">${escapeHtml(p.timing)} — ${escapeHtml(p.title)} (${escapeHtml(p.subtitle)})</option>
      `).join('');
    }

    if (catSelect) {
      catSelect.innerHTML = Object.entries(CATEGORIES).map(([k, c]) => `
        <option value="${escapeHtml(k)}">${escapeHtml(c.name)}</option>
      `).join('');
    }

    if (bagSelect) {
      let opts = '';
      for (const [key, bag] of Object.entries(trip.baggages)) {
        opts += `<option value="${escapeHtml(key)}">${escapeHtml(bag.name)}</option>`;
      }
      opts += `<option value="porte">Sur soi / Poches</option>`;
      bagSelect.innerHTML = opts;
    }

    if (iataGroup) {
      iataGroup.style.display = trip.transport === 'avion' ? 'block' : 'none';
    }

    const existing = editId ? trip.items.find(i => i.id === editId) : null;
    document.getElementById('itemModalTitle').textContent = existing ? "Modifier l'article" : 'Nouvel article';
    document.getElementById('editItemId').value = existing ? existing.id : '';
    document.getElementById('itemName').value = existing ? existing.name : '';
    document.getElementById('itemNote').value = existing ? (existing.note || '') : '';
    document.getElementById('itemPhase').value = existing
      ? (existing.phase || 'phase_pack')
      : (appState.viewMode === 'chrono' && appState.filterPhase !== 'all' ? appState.filterPhase : 'phase_pack');
    const personSelect = document.getElementById('itemPerson');
    if (personSelect) {
      personSelect.value = existing ? (existing.person || 'shared') : 'shared';
    }
    document.getElementById('itemCategory').value = existing ? existing.cat : 'practical';
    document.getElementById('itemBaggage').value = existing
      ? existing.baggage
      : (appState.filterBaggage !== 'all' ? appState.filterBaggage : getDefaultBaggageKey(trip.baggages));
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

    const name = sanitizeText(document.getElementById('itemName').value, 160);
    if (!name) return;

    const note = sanitizeText(document.getElementById('itemNote')?.value, 160);
    const editId = document.getElementById('editItemId').value;
    const personVal = document.getElementById('itemPerson')?.value;
    const payload = {
      name,
      note,
      phase: CHRONO_PHASES[document.getElementById('itemPhase').value] ? document.getElementById('itemPhase').value : 'phase_pack',
      person: (typeof PERSON_GROUPS !== 'undefined' && PERSON_GROUPS[personVal]) ? personVal : 'shared',
      cat: CATEGORIES[document.getElementById('itemCategory').value] ? document.getElementById('itemCategory').value : 'practical',
      baggage: document.getElementById('itemBaggage').value,
      qty: Math.max(1, Math.min(999, parseInt(document.getElementById('itemQty').value, 10) || 1)),
      weight: Math.max(0, Math.min(100000, parseInt(document.getElementById('itemWeight').value, 10) || 0)),
      iata: trip.transport === 'avion' ? document.getElementById('itemIata').value : ''
    };

    if (editId) {
      const idx = trip.items.findIndex(i => i.id === editId);
      if (idx !== -1) trip.items[idx] = { ...trip.items[idx], ...payload };
      showToast('Article mis à jour');
    } else {
      trip.items.push({ id: 'custom_' + Date.now() + '_' + Math.floor(Math.random() * 1000), ...payload, custom: true, checked: false });
      showToast('Article ajouté');
    }

    closeItemModal();
    saveState();
  }

  // === ÉDITION DES FRANCHISES DE BAGAGES ===
  function openBaggageLimitsModal() {
    const trip = getActiveTrip();
    if (!trip) return;

    const fieldsEl = document.getElementById('baggageLimitsFields');
    if (!fieldsEl) return;

    fieldsEl.innerHTML = Object.entries(trip.baggages).map(([key, bag]) => {
      const kgVal = (bag.limit / 1000).toFixed(bag.limit % 1000 === 0 ? 0 : 1);
      return `
        <div class="baggage-limit-row">
          <label class="baggage-limit-name" for="limitInput_${escapeHtml(key)}">${escapeHtml(bag.name)}</label>
          <div class="baggage-limit-input-wrap">
            <input type="number" id="limitInput_${escapeHtml(key)}" data-bag-key="${escapeHtml(key)}" class="form-control baggage-limit-input tabular-nums" min="0.5" max="200" step="0.5" value="${kgVal}" required>
            <span class="baggage-limit-unit">kg</span>
          </div>
        </div>
      `;
    }).join('');

    document.getElementById('baggageLimitsModal')?.classList.add('open');
  }

  function scaleBaggageLimitsToParty() {
    const trip = getActiveTrip();
    if (!trip) return;
    const p = normalizeParty(trip.party);
    const travelers = Math.max(1, p.adultsMen + p.adultsWomen + p.teensBoys + p.teensGirls + p.childrenBoys + p.childrenGirls);
    const defaultBags = (TRANSPORTS[trip.transport] || TRANSPORTS.avion).baggages;

    document.querySelectorAll('#baggageLimitsFields [data-bag-key]').forEach(input => {
      const key = input.dataset.bagKey;
      const baseLimit = defaultBags[key]?.limit || trip.baggages[key]?.limit || 10000;
      const scaledKg = Math.min(200, (baseLimit / 1000) * travelers);
      input.value = Number.isInteger(scaledKg) ? String(scaledKg) : scaledKg.toFixed(1);
    });
  }

  function resetBaggageLimitsToDefault() {
    const trip = getActiveTrip();
    if (!trip) return;
    const defaultBags = (TRANSPORTS[trip.transport] || TRANSPORTS.avion).baggages;

    document.querySelectorAll('#baggageLimitsFields [data-bag-key]').forEach(input => {
      const key = input.dataset.bagKey;
      const baseLimit = defaultBags[key]?.limit || 10000;
      const kg = baseLimit / 1000;
      input.value = Number.isInteger(kg) ? String(kg) : kg.toFixed(1);
    });
  }

  function saveBaggageLimitsForm() {
    const trip = getActiveTrip();
    if (!trip) return;

    document.querySelectorAll('#baggageLimitsFields [data-bag-key]').forEach(input => {
      const key = input.dataset.bagKey;
      const kg = parseFloat(input.value);
      if (!Number.isNaN(kg) && kg >= 0.5 && kg <= 200 && trip.baggages[key]) {
        trip.baggages[key].limit = Math.round(kg * 1000);
      }
    });

    document.getElementById('baggageLimitsModal')?.classList.remove('open');
    saveState();
    showToast('Franchises de poids mises à jour');
  }

  // === GESTION MULTI-VOYAGES & FORMULAIRE DE CRÉATION ===
  function openTripModal(trip = null) {
    const modal = document.getElementById('tripModal');
    const isEdit = Boolean(trip);

    document.getElementById('tripModalTitle').textContent = isEdit ? 'Modifier le voyage' : 'Nouveau voyage';
    document.getElementById('tripSubmitBtn').textContent = isEdit ? 'Enregistrer' : 'Créer la checklist';
    document.getElementById('editTripId').value = isEdit ? trip.id : '';
    document.getElementById('tripNameInput').value = isEdit ? trip.name : '';
    document.getElementById('tripDateInput').value = isEdit ? (trip.departureDate || '') : '';

    selectedCountryKey = isEdit ? trip.countryKey : 'france';
    selectedTransport = isEdit ? trip.transport : 'avion';
    selectedSeason = isEdit ? trip.season : 'misaison';
    selectedTripType = isEdit ? trip.tripType : 'weekend';
    selectedDays = isEdit
      ? (Number(trip.days) || TRIP_TYPES[trip.tripType]?.duration || 3)
      : (TRIP_TYPES[selectedTripType]?.duration || 3);
    selectedLaundry = isEdit ? Boolean(trip.laundry) : false;

    const laundryToggle = document.getElementById('tripLaundryToggle');
    if (laundryToggle) laundryToggle.checked = selectedLaundry;

    if (isEdit && trip.party) {
      currentParty = normalizeParty(trip.party);
    } else {
      currentParty = createDefaultParty();
    }

    const hasMinors =
      currentParty.teensBoys + currentParty.teensGirls +
      currentParty.childrenBoys + currentParty.childrenGirls +
      currentParty.babies > 0;
    setChildrenAccordionOpen(isEdit && hasMinors);

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
    const days = Math.max(1, Math.min(365, Number.isNaN(daysInputVal) ? selectedDays : daysInputVal));
    const departureDate = sanitizeDateStr(document.getElementById('tripDateInput')?.value);
    const laundry = Boolean(document.getElementById('tripLaundryToggle')?.checked);
    const season = selectedSeason;
    const transport = selectedTransport;
    const activities = Array.from(selectedActivities);
    const party = JSON.parse(JSON.stringify(currentParty));

    let name = sanitizeText(document.getElementById('tripNameInput').value, 100);
    if (!name) {
      const cName = COUNTRIES[countryKey]?.name || 'Voyage';
      const sClean = (SEASONS[season]?.label || '').split('/')[0].trim();
      name = `${cName} — ${sClean}`;
    }

    if (editId) {
      const trip = appState.trips.find(t => t.id === editId);
      if (trip) {
        const transportChanged = trip.transport !== transport;
        const paramsChanged =
          trip.days !== days ||
          Boolean(trip.laundry) !== laundry ||
          trip.countryKey !== countryKey ||
          trip.season !== season ||
          JSON.stringify(trip.party) !== JSON.stringify(party) ||
          JSON.stringify(trip.activities || []) !== JSON.stringify(activities);

        trip.name = name;
        trip.countryKey = countryKey;
        trip.tripType = tripType;
        trip.days = days;
        trip.departureDate = departureDate;
        trip.laundry = laundry;
        trip.season = season;
        trip.transport = transport;
        trip.party = party;
        trip.activities = activities;

        const applyRecalculatedChecklist = () => {
          const prevItems = Array.isArray(trip.items) ? trip.items : [];
          const prevBaggages = trip.baggages || {};
          const existingByNormName = new Map();
          prevItems.forEach(it => {
            const norm = String(it.name || '').toLowerCase().trim();
            if (norm && !existingByNormName.has(norm)) {
              existingByNormName.set(norm, it);
            }
          });

          const fresh = generateChecklist({ countryKey, tripType, season, transport, activities, party, days, laundry });

          // Conserver les franchises personnalisées si le transport n'a pas changé
          if (!transportChanged) {
            for (const [bKey, bVal] of Object.entries(prevBaggages)) {
              if (fresh.baggages[bKey] && Number(bVal?.limit) > 0) {
                fresh.baggages[bKey].limit = bVal.limit;
              }
            }
          }

          const freshNormNames = new Set();
          fresh.items.forEach(it => {
            const norm = String(it.name || '').toLowerCase().trim();
            freshNormNames.add(norm);
            const prev = existingByNormName.get(norm);
            if (prev) {
              it.checked = Boolean(prev.checked);
              if (prev.note) it.note = prev.note;
              if (prev.baggage === 'porte' || fresh.baggages[prev.baggage]) {
                it.baggage = prev.baggage;
              }
              if (prev.person && prev.person !== 'shared' && typeof PERSON_GROUPS !== 'undefined' && PERSON_GROUPS[prev.person]) {
                it.person = prev.person;
              }
            }
          });

          // Fusionner les articles personnalisés ajoutés à la main qui ne figurent pas dans la checklist générée
          const fallbackBag = getDefaultBaggageKey(fresh.baggages);
          let keptCustomCount = 0;
          prevItems.forEach(prev => {
            const isCustom = Boolean(prev.custom || String(prev.id || '').startsWith('custom_'));
            if (!isCustom) return;
            const norm = String(prev.name || '').toLowerCase().trim();
            if (!norm || freshNormNames.has(norm)) return;

            freshNormNames.add(norm);
            const mergedCustom = {
              ...prev,
              custom: true,
              baggage: (prev.baggage === 'porte' || fresh.baggages[prev.baggage]) ? prev.baggage : fallbackBag,
              iata: transport === 'avion' ? (prev.iata || '') : ''
            };
            fresh.items.push(mergedCustom);
            keptCustomCount++;
          });

          trip.baggages = fresh.baggages;
          trip.items = fresh.items;
          return keptCustomCount;
        };

        const regen = document.getElementById('tripRegenerateItems')?.checked;
        if (regen) {
          applyRecalculatedChecklist();
        } else {
          const baseBags = JSON.parse(JSON.stringify((TRANSPORTS[transport] || TRANSPORTS.avion).baggages));
          if (!transportChanged && trip.baggages) {
            for (const [bKey, bVal] of Object.entries(trip.baggages)) {
              if (baseBags[bKey] && Number(bVal?.limit) > 0) {
                baseBags[bKey].limit = bVal.limit;
              }
            }
          }
          trip.baggages = baseBags;

          // Réaffectation automatique des articles dont le bagage n'existe plus (ex: Avion -> Train/Voiture)
          const fallbackBag = getDefaultBaggageKey(trip.baggages);
          let movedCount = 0;
          trip.items.forEach(item => {
            if (item.baggage !== 'porte' && !trip.baggages[item.baggage]) {
              item.baggage = fallbackBag;
              movedCount++;
            }
            if (transport !== 'avion') {
              item.iata = '';
            }
          });
          if (appState.filterBaggage !== 'all' && appState.filterBaggage !== 'porte' && !trip.baggages[appState.filterBaggage]) {
            appState.filterBaggage = 'all';
          }
          if (movedCount > 0) {
            showToast(`Voyage mis à jour (${movedCount} article${movedCount > 1 ? 's' : ''} réaffecté${movedCount > 1 ? 's' : ''})`);
            closeTripModal();
            saveState();
            return;
          }
          if (paramsChanged) {
            showToast('Paramètres modifiés : recalculer les quantités ?', {
              actionLabel: 'Recalculer',
              duration: 5500,
              onAction: () => {
                const kept = applyRecalculatedChecklist();
                saveState();
                showToast(kept > 0
                  ? `Quantités recalculées (${kept} article${kept > 1 ? 's' : ''} personnalisé${kept > 1 ? 's' : ''} conservé${kept > 1 ? 's' : ''})`
                  : 'Quantités et articles recalculés');
              }
            });
            closeTripModal();
            saveState();
            return;
          }
        }
        showToast('Voyage mis à jour');
      }
    } else {
      const newTrip = createTripObject({ name, countryKey, tripType, season, transport, activities, party, days, departureDate, laundry });
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
        name: 'Grand Voyage Japon',
        countryKey: 'japon',
        tripType: 'long',
        days: 15,
        laundry: true,
        season: 'misaison',
        transport: 'avion',
        activities: ['photo', 'culture', 'soiree'],
        party: { adultsMen: 1, adultsWomen: 1, teensBoys: 0, teensGirls: 0, childrenBoys: 0, childrenGirls: 0, babies: 0, pets: { enabled: false } }
      },
      plage: {
        name: 'Séjour Plage & Soleil',
        countryKey: 'espagne',
        tripType: 'plage',
        days: 7,
        season: 'ete',
        transport: 'avion',
        activities: ['plage', 'nautique', 'soiree', 'lecture'],
        party: { adultsMen: 1, adultsWomen: 1, teensBoys: 0, teensGirls: 0, childrenBoys: 0, childrenGirls: 0, babies: 0, pets: { enabled: false } }
      },
      famille: {
        name: 'Vacances Famille & Chien',
        countryKey: 'france',
        tripType: 'plage',
        days: 7,
        season: 'ete',
        transport: 'voiture',
        activities: ['plage', 'lecture', 'jeux'],
        party: { adultsMen: 1, adultsWomen: 1, teensBoys: 0, teensGirls: 0, childrenBoys: 1, childrenGirls: 0, babies: 1, pets: { enabled: true, dogs: 1, takesPet: true } }
      },
      ski: {
        name: 'Séjour Ski & Montagne',
        countryKey: 'france',
        tripType: 'ski',
        days: 7,
        season: 'hiver',
        transport: 'voiture',
        activities: ['ski', 'soiree'],
        party: { adultsMen: 1, adultsWomen: 1, teensBoys: 1, teensGirls: 0, childrenBoys: 0, childrenGirls: 0, babies: 0, pets: { enabled: false } }
      },
      city: {
        name: 'City-trip Londres',
        countryKey: 'angleterre',
        tripType: 'weekend',
        days: 3,
        season: 'misaison',
        transport: 'avion',
        activities: ['culture', 'soiree'],
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

    showConfirm('Supprimer le voyage', `Supprimer définitivement « ${trip.name} » ?`, 'Supprimer', () => {
      appState.trips = appState.trips.filter(t => t.id !== tripId);
      if (appState.activeTripId === tripId) {
        appState.activeTripId = appState.trips[0]?.id || null;
        appState.filterBaggage = 'all';
        appState.filterPhase = 'all';
      }
      saveState();
      if (document.getElementById('tripsModal')?.classList.contains('open')) {
        renderTripsList();
      }
      showToast('Voyage supprimé');
    });
  }

  function duplicateTripById(tripId) {
    const trip = appState.trips.find(t => t.id === tripId);
    if (!trip) return;

    const now = Date.now();
    const copy = JSON.parse(JSON.stringify(trip));
    copy.id = `trip_${now}_${Math.floor(Math.random() * 10000)}`;
    copy.name = sanitizeText(`${trip.name} (copie)`, 100);
    copy.departureDate = '';
    copy.items = (copy.items || []).map((item, idx) => ({
      ...item,
      id: `it_${now}_${idx + 1}`,
      checked: false
    }));

    appState.trips.push(copy);
    appState.activeTripId = copy.id;
    appState.filterBaggage = 'all';
    appState.filterPhase = 'all';
    closeTripsModal();
    saveState();
    showToast(`Voyage « ${copy.name} » dupliqué`);
  }

  // === MODE RETOUR & PARTAGE TEXTE ===
  function prepareReturnMode() {
    const trip = getActiveTrip();
    if (!trip) return;

    let resetCount = 0;
    trip.items.forEach(item => {
      if (item.phase === 'phase_pack' || item.phase === 'phase_return') {
        if (item.checked) resetCount++;
        item.checked = false;
      }
    });

    appState.viewMode = 'chrono';
    appState.filterPhase = 'all';
    appState.filterStatus = 'all';
    if (appState.collapsedSections) {
      delete appState.collapsedSections['chrono:phase_pack'];
      delete appState.collapsedSections['chrono:phase_return'];
    }

    saveState();
    showToast(
      resetCount > 0
        ? `Mode retour activé : ${resetCount} article(s) décoché(s) pour le remballage`
        : 'Mode retour prêt : vérifiez votre valise et la chambre !'
    );
  }

  async function shareTripAsText() {
    const trip = getActiveTrip();
    if (!trip) return;

    const country = COUNTRIES[trip.countryKey] || COUNTRIES.france;
    const totalChecked = trip.items.filter(i => i.checked).length;
    const onlyTodo = appState.filterStatus === 'todo';
    const itemsToShare = onlyTodo ? trip.items.filter(i => !i.checked) : trip.items;

    const lines = [
      `${country.flag} ${trip.name} (${country.name} · ${trip.days || 3} j)`,
      `Progression : ${totalChecked}/${trip.items.length} préparés · ${(getAllWeight(trip) / 1000).toFixed(2)} kg`,
      onlyTodo ? '(Articles restants à préparer)' : '',
      ''
    ].filter((l, idx) => idx !== 2 || l !== '');

    for (const [pKey, phase] of Object.entries(CHRONO_PHASES)) {
      const pItems = itemsToShare.filter(i => (i.phase || 'phase_pack') === pKey);
      if (pItems.length === 0) continue;
      lines.push(`▸ ${phase.title} (${phase.timing})`);
      pItems.forEach(item => {
        const box = item.checked ? '☑' : '☐';
        const qty = item.qty > 1 ? ` ×${item.qty}` : '';
        const bag = trip.baggages[item.baggage]?.name || (item.baggage === 'porte' ? 'Sur soi' : '');
        const note = item.note ? ` — ${item.note}` : '';
        lines.push(`${box} ${item.name}${qty}${bag ? ` [${bag}]` : ''}${note}`);
      });
      lines.push('');
    }

    const text = lines.join('\n').trim();

    if (navigator.share) {
      try {
        await navigator.share({ title: trip.name, text });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showToast('Checklist copiée dans le presse-papiers');
        return;
      }
    } catch (e) {}

    // Fallback copie presse-papiers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Checklist copiée dans le presse-papiers');
    } catch (e) {
      showToast('Impossible de copier automatiquement');
    }
    ta.remove();
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
      const safeId = escapeHtml(t.id);
      const isActive = t.id === appState.activeTripId;
      const c = COUNTRIES[t.countryKey] || COUNTRIES.france;
      const done = t.items.filter(i => i.checked).length;
      return `
        <div class="list-card ${isActive ? 'active' : ''}">
          <button type="button" class="list-card-info" data-action="select-trip" data-id="${safeId}">
            <h4>${getCountryFlagSvg(t.countryKey, 'country-flag-inline')} ${escapeHtml(t.name)}</h4>
            <p>${done}/${t.items.length} préparés · ${formatWeightKg(getAllWeight(t), 1)} kg</p>
          </button>
          <div class="list-card-actions">
            <button type="button" class="icon-btn icon-btn-subtle" data-action="duplicate-trip" data-id="${safeId}" title="Dupliquer" aria-label="Dupliquer ce voyage">${SVG_COPY}</button>
            <button type="button" class="icon-btn icon-btn-subtle icon-btn-danger" data-action="delete-trip" data-id="${safeId}" title="Supprimer" aria-label="Supprimer">${SVG_TRASH}</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function selectTrip(tripId) {
    if (!appState.trips.some(t => t.id === tripId)) return;
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
      html += appState.customTemplates.map(tpl => {
        const safeId = escapeHtml(tpl.id);
        return `
          <div class="list-card">
            <div class="list-card-info">
              <h4>${escapeHtml(tpl.name)}</h4>
              <p>${tpl.items.length} articles · ${tpl.days || 3} j · ${escapeHtml(COUNTRIES[tpl.countryKey]?.name || '')}</p>
            </div>
            <div class="list-card-actions">
              <button type="button" class="btn btn-primary btn-sm" data-action="load-custom-tpl" data-id="${safeId}">Utiliser</button>
              <button type="button" class="icon-btn icon-btn-subtle icon-btn-danger" data-action="delete-custom-tpl" data-id="${safeId}" aria-label="Supprimer">${SVG_TRASH}</button>
            </div>
          </div>
        `;
      }).join('');
    }

    html += `<p class="section-micro-label">Modèles prédéfinis</p>`;
    html += DEFAULT_TEMPLATES.map(tpl => {
      const safeId = escapeHtml(tpl.id);
      return `
        <div class="list-card">
          <div class="list-card-info">
            <h4>${escapeHtml(tpl.name)}</h4>
            <p>${escapeHtml(TRIP_TYPES[tpl.tripType]?.label || '')} · ${escapeHtml(TRANSPORTS[tpl.transport]?.label || '')}</p>
          </div>
          <div class="list-card-actions">
            <button type="button" class="btn btn-secondary btn-sm" data-action="load-default-tpl" data-id="${safeId}">Utiliser</button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  function saveCurrentTripAsTemplate() {
    const trip = getActiveTrip();
    if (!trip) return;

    const newTpl = {
      id: 'ctpl_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: trip.name,
      countryKey: trip.countryKey,
      tripType: trip.tripType,
      days: trip.days || TRIP_TYPES[trip.tripType]?.duration || 3,
      laundry: Boolean(trip.laundry),
      season: trip.season,
      transport: trip.transport,
      party: normalizeParty(trip.party),
      activities: [...(trip.activities || [])],
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
      name: 'Checklist vierge',
      countryKey: 'france',
      tripType: 'weekend',
      season: 'misaison',
      transport: 'avion',
      blank: true
    });
    appState.trips.push(newTrip);
    appState.activeTripId = newTrip.id;
    appState.filterBaggage = 'all';
    appState.filterPhase = 'all';
    closeTemplatesModal();
    saveState();
    showToast('Checklist vierge créée');
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
    showToast('Modèle chargé');
  }

  function loadCustomTemplate(tplId) {
    const tpl = appState.customTemplates.find(t => t.id === tplId);
    if (!tpl) return;
    const now = Date.now();
    const newTrip = {
      id: `trip_${now}_${Math.floor(Math.random() * 10000)}`,
      name: tpl.name,
      countryKey: tpl.countryKey,
      tripType: tpl.tripType,
      days: Math.max(1, Math.min(365, Number(tpl.days) || TRIP_TYPES[tpl.tripType]?.duration || 3)),
      departureDate: '',
      laundry: Boolean(tpl.laundry),
      season: tpl.season,
      transport: tpl.transport,
      party: normalizeParty(tpl.party),
      activities: [...(tpl.activities || [])],
      baggages: JSON.parse(JSON.stringify(tpl.baggages)),
      items: JSON.parse(JSON.stringify(tpl.items)).map((i, idx) => ({
        ...i,
        id: `it_${now}_${idx + 1}`,
        checked: false
      }))
    };
    appState.trips.push(newTrip);
    appState.activeTripId = newTrip.id;
    appState.filterBaggage = 'all';
    appState.filterPhase = 'all';
    closeTemplatesModal();
    saveState();
    showToast('Modèle chargé');
  }

  function deleteCustomTemplate(tplId) {
    appState.customTemplates = appState.customTemplates.filter(t => t.id !== tplId);
    saveState(false);
    renderTemplatesList();
    showToast('Modèle supprimé');
  }

  // === EXPORT / IMPORT ===
  function exportData() {
    const json = JSON.stringify(appState, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', url);
    dlAnchor.setAttribute('download', `valise-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Sauvegarde exportée');
  }

  function importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Fichier trop volumineux (max 5 Mo)');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const raw = JSON.parse(event.target.result);
        const clean = sanitizeImportedState(raw);
        if (!clean) {
          showToast('Format de sauvegarde invalide');
          return;
        }
        appState = clean;
        saveState();
        showToast(`Sauvegarde importée (${clean.trips.length} voyage${clean.trips.length > 1 ? 's' : ''})`);
      } catch (err) {
        showToast('Erreur lors de la lecture du fichier JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // === SYSTÈME DE MISE À JOUR HYBRIDE (GitHub Releases + Branche main Git) ===
  function compareVersions(v1, v2) {
    const clean1 = String(v1 || '').replace(/^v/i, '').trim();
    const clean2 = String(v2 || '').replace(/^v/i, '').trim();
    const parts1 = clean1.split('.').map(n => parseInt(n, 10) || 0);
    const parts2 = clean2.split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < len; i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  async function fetchLatestReleaseInfo() {
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
        cache: 'no-cache'
      });
      if (!res.ok) return null;
      const rel = await res.json();
      const version = rel.tag_name || rel.name;
      if (!version) return null;
      const apkAsset = Array.isArray(rel.assets)
        ? rel.assets.find(a => String(a.name || '').toLowerCase().endsWith('.apk'))
        : null;
      return {
        version,
        body: rel.body || '',
        apkUrl: apkAsset?.browser_download_url || rel.html_url || '',
        htmlUrl: rel.html_url || `https://github.com/${GITHUB_REPO}/releases`,
        source: 'release'
      };
    } catch {
      return null;
    }
  }

  async function fetchMainBranchInfo() {
    try {
      const pkgRes = await fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/package.json?t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!pkgRes.ok) return null;
      const pkg = await pkgRes.json();
      if (!pkg || !pkg.version) return null;

      let commitNotes = '';
      try {
        const commitRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/commits/main`, {
          headers: { Accept: 'application/vnd.github.v3+json' },
          cache: 'no-cache'
        });
        if (commitRes.ok) {
          const commitData = await commitRes.json();
          commitNotes = commitData?.commit?.message || '';
        }
      } catch {}

      return {
        version: `v${String(pkg.version).replace(/^v/i, '')}`,
        body: commitNotes || 'Nouvelle mise à jour disponible sur le dépôt Git (branche main).',
        apkUrl: `https://github.com/${GITHUB_REPO}/raw/main/Checklist-Valise.apk`,
        standaloneUrl: `https://github.com/${GITHUB_REPO}/raw/main/checklist-valise-standalone.html`,
        htmlUrl: `https://github.com/${GITHUB_REPO}`,
        source: 'git-main'
      };
    } catch {
      return null;
    }
  }

  async function checkForAppUpdates(isManual = false) {
    if (isManual) {
      showToast('Vérification des mises à jour sur Git...', { replaceId: 'app-update' });
    }

    try {
      const [releaseInfo, mainInfo] = await Promise.all([
        fetchLatestReleaseInfo(),
        fetchMainBranchInfo()
      ]);

      let bestUpdate = null;
      if (releaseInfo && mainInfo) {
        bestUpdate = compareVersions(mainInfo.version, releaseInfo.version) >= 0 ? mainInfo : releaseInfo;
      } else {
        bestUpdate = mainInfo || releaseInfo;
      }

      if (!bestUpdate) {
        if (isManual) showToast('Impossible de vérifier sur Git (vérifiez votre connexion)', { replaceId: 'app-update' });
        return;
      }

      if (compareVersions(bestUpdate.version, CURRENT_APP_VERSION) > 0) {
        if (!isManual) {
          const dismissed = localStorage.getItem(UPDATE_DISMISSED_KEY);
          if (dismissed) {
            try {
              const parsed = JSON.parse(dismissed);
              if (parsed.version === bestUpdate.version && (Date.now() - parsed.time < 24 * 3600 * 1000)) {
                return;
              }
            } catch (e) {}
          }
        }
        latestReleaseData = bestUpdate;
        showUpdateModal(bestUpdate);
      } else if (isManual) {
        showToast(`Application à jour (v${CURRENT_APP_VERSION})`, { replaceId: 'app-update' });
      }
    } catch (err) {
      console.warn('Échec de la vérification de mise à jour:', err);
      if (isManual) {
        showToast('Impossible de vérifier (vérifiez votre connexion internet)', { replaceId: 'app-update' });
      }
    }
  }

  function showUpdateModal(updateInfo) {
    const modal = document.getElementById('updateModal');
    if (!modal) return;

    const badge = document.getElementById('updateVersionBadge');
    const notes = document.getElementById('updateNotes');
    const instructions = document.getElementById('updateInstructions');
    const downloadBtn = document.getElementById('updateDownloadBtn');
    const webRefreshBtn = document.getElementById('updateWebRefreshBtn');

    if (badge) {
      badge.textContent = `Version ${updateInfo.version} disponible (actuelle : v${CURRENT_APP_VERSION})`;
    }
    if (notes) {
      notes.textContent = updateInfo.body && updateInfo.body.trim()
        ? updateInfo.body.trim()
        : 'Améliorations générales et corrections de bugs.';
    }
    if (instructions) instructions.style.display = 'none';

    const nativeAndroid = isNativeAndroidApp();
    const isWebHttp = window.location.protocol.startsWith('http');

    if (webRefreshBtn) {
      webRefreshBtn.style.display = (!nativeAndroid && isWebHttp) ? 'inline-flex' : 'none';
      webRefreshBtn.className = (!nativeAndroid && isWebHttp) ? 'btn btn-primary' : 'btn btn-secondary';
    }

    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.className = (!nativeAndroid && isWebHttp) ? 'btn btn-secondary' : 'btn btn-primary';
      const label = nativeAndroid
        ? 'Télécharger et installer'
        : (window.location.protocol === 'file:' ? 'Télécharger depuis Git' : 'Télécharger APK Android');
      downloadBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>${label}</span>
      `;
    }

    modal.classList.add('open');
  }

  function closeUpdateModal() {
    document.getElementById('updateModal')?.classList.remove('open');
  }

  function dismissUpdate() {
    if (latestReleaseData?.version) {
      localStorage.setItem(UPDATE_DISMISSED_KEY, JSON.stringify({
        version: latestReleaseData.version,
        time: Date.now()
      }));
    }
    closeUpdateModal();
  }

  async function refreshWebAppFromGit() {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.update()));
      }
    } catch (e) {}
    window.location.reload();
  }

  function downloadAndInstallUpdate() {
    if (!latestReleaseData) return;

    const nativeAndroid = isNativeAndroidApp();
    let targetUrl = (!nativeAndroid && window.location.protocol === 'file:' && latestReleaseData.standaloneUrl)
      ? latestReleaseData.standaloneUrl
      : (latestReleaseData.apkUrl || latestReleaseData.htmlUrl);

    if (!isTrustedUpdateUrl(targetUrl)) {
      targetUrl = `https://github.com/${GITHUB_REPO}`;
    }

    window.open(targetUrl, nativeAndroid ? '_system' : '_blank', 'noopener,noreferrer');

    if (nativeAndroid) {
      const instructions = document.getElementById('updateInstructions');
      if (instructions) instructions.style.display = 'block';
    }

    const downloadBtn = document.getElementById('updateDownloadBtn');
    if (downloadBtn) {
      downloadBtn.innerHTML = `<span>Téléchargement lancé ✔</span>`;
      downloadBtn.disabled = true;
    }
  }

  // === COMPTE UTILISATEUR, AUTHENTIFICATION & SYNCHRONISATION CLOUD (MODÈLE L'AFFINOIR) ===
  function ensureValidActiveTrip() {
    if (!appState.trips || appState.trips.length === 0) {
      appState.activeTripId = null;
      return;
    }
    if (!appState.activeTripId || !appState.trips.some(t => t.id === appState.activeTripId)) {
      appState.activeTripId = appState.trips[0].id;
    }
  }

  async function activerSyncCloud() {
    const fb = window.ValiseFirebase;
    if (!fb || !fb.estConnecteFirebase()) return;
    reinitialiserEtatCloud();
    cloudState.syncStatus = 'syncing';
    majStatutSyncModal();

    const user = fb.getFirebaseUser();
    const currentUid = user ? user.uid : null;
    const previousUid = localStorage.getItem(LAST_UID_KEY);
    const isNewDeviceLogin = !!(currentUid && previousUid !== currentUid);
    let needsPushAfterInit = false;

    const collectionMap = {
      trips: 'trips',
      templates: 'customTemplates'
    };

    fb.demarrerSyncFirestore({
      onCollectionUpdate: (colName, list, fromCache = false) => {
        const stateKey = collectionMap[colName];
        if (!stateKey) return;

        // Ne jamais traiter un cache local vide comme un serveur vide
        if (fromCache && list.length === 0) {
          return;
        }

        const usedIds = new Set();
        const sanitizedList = colName === 'trips'
          ? list.map(t => sanitizeTrip(t, usedIds)).filter(Boolean)
          : list.map(tpl => sanitizeTemplate(tpl, usedIds)).filter(Boolean);

        const isFirstServerForCol = !fromCache && !cloudState.syncedCols[colName];
        const localItems = appState[stateKey] || [];

        if (isFirstServerForCol) {
          cloudState.syncedCols[colName] = true;

          if (sanitizedList.length === 0 && localItems.length > 0) {
            // Serveur réellement vide et données locales présentes : pousser vers le cloud après init complète
            needsPushAfterInit = true;
          } else if (sanitizedList.length > 0 && localItems.length > 0 && isNewDeviceLogin) {
            // Première connexion sur cet appareil / compte : fusionner serveur + éléments locaux absents du serveur
            const serverIds = new Set(sanitizedList.map(i => String(i.id)));
            const localOnly = localItems.filter(i => i && i.id && !serverIds.has(String(i.id)));
            const merged = [...sanitizedList, ...localOnly];
            _suppressCloudSync = true;
            appState[stateKey] = merged;
            ensureValidActiveTrip();
            saveState(false, true);
            _suppressCloudSync = false;
            if (localOnly.length > 0) {
              needsPushAfterInit = true;
            }
          } else {
            _suppressCloudSync = true;
            appState[stateKey] = sanitizedList;
            ensureValidActiveTrip();
            saveState(false, true);
            _suppressCloudSync = false;
          }

          if (Object.keys(cloudState.syncedCols).length >= 2) {
            cloudState.initialSyncDone = true;
            cloudState.syncStatus = 'synced';
            cloudState.lastSyncedAt = new Date().toISOString();
            if (currentUid) localStorage.setItem(LAST_UID_KEY, currentUid);
            if (needsPushAfterInit) {
              needsPushAfterInit = false;
              saveState(false, false);
            }
          }
        } else {
          _suppressCloudSync = true;
          appState[stateKey] = sanitizedList;
          ensureValidActiveTrip();
          saveState(false, true);
          _suppressCloudSync = false;
        }

        majStatutSyncModal();
        render();
      },
      onSettingsUpdate: (data) => {
        if (!data || typeof data !== 'object') return;
        _suppressCloudSync = true;
        if (typeof data.activeTripId === 'string' && appState.trips.some(t => t.id === data.activeTripId)) {
          appState.activeTripId = data.activeTripId;
        }
        if (['chrono', 'baggage', 'category', 'person'].includes(data.viewMode)) {
          appState.viewMode = data.viewMode;
        }
        if (data.filterPhase === 'all' || CHRONO_PHASES[data.filterPhase]) {
          appState.filterPhase = data.filterPhase;
        }
        if (typeof data.filterBaggage === 'string' && data.filterBaggage) {
          appState.filterBaggage = sanitizeId(data.filterBaggage, 'all');
        }
        if (['all', 'todo', 'done'].includes(data.filterStatus)) {
          appState.filterStatus = data.filterStatus;
        }
        if (data.collapsedSections && typeof data.collapsedSections === 'object' && !Array.isArray(data.collapsedSections)) {
          const cleanCollapsed = {};
          for (const [k, v] of Object.entries(data.collapsedSections)) {
            if (v === true && typeof k === 'string' && /^[a-z]+:[a-zA-Z0-9_:-]+$/.test(k)) {
              cleanCollapsed[k] = true;
            }
          }
          appState.collapsedSections = cleanCollapsed;
        }
        ensureValidActiveTrip();
        saveState(true, true);
        _suppressCloudSync = false;
      },
      onSyncError: (err) => {
        cloudState.syncStatus = 'error';
        if (err?.code === 'permission-denied') {
          cloudState.syncError = 'Accès Firestore refusé (vérifiez que votre e-mail est bien vérifié et autorisé).';
        } else {
          cloudState.syncError = err?.message || 'Erreur de synchronisation Firestore';
        }
        majStatutSyncModal();
      }
    });
  }

  async function forcerSyncCloud() {
    const fb = window.ValiseFirebase;
    if (!fb || !fb.estConnecteFirebase()) throw new Error('Non connecté au Cloud.');
    cloudState.syncStatus = 'syncing';
    cloudState.syncError = null;
    try {
      await fb.syncAllUserDataToFirestore(appState);
      cloudState.syncStatus = 'synced';
      cloudState.lastSyncedAt = new Date().toISOString();
      const user = fb.getFirebaseUser();
      if (user?.uid) localStorage.setItem(LAST_UID_KEY, user.uid);
      return true;
    } catch (err) {
      cloudState.syncStatus = 'error';
      cloudState.syncError = err?.code === 'permission-denied'
        ? 'Accès Firestore refusé (vérifiez que votre compte est bien autorisé).'
        : (err?.message || 'Erreur de synchronisation Firestore');
      throw new Error(cloudState.syncError);
    }
  }

  function majStatutSyncModal() {
    const statusEl = document.getElementById('auth-sync-status');
    const syncErrEl = document.getElementById('auth-sync-error-msg');
    if (!statusEl) return;

    if (cloudState.syncStatus === 'syncing') {
      statusEl.textContent = 'Synchronisation en cours…';
      statusEl.style.color = 'var(--solar)';
    } else if (cloudState.syncStatus === 'error') {
      statusEl.textContent = 'Erreur de synchronisation';
      statusEl.style.color = 'var(--danger)';
      if (syncErrEl && cloudState.syncError) {
        syncErrEl.textContent = cloudState.syncError;
        syncErrEl.style.display = 'block';
      }
    } else if (cloudState.initialSyncDone || cloudState.syncStatus === 'synced') {
      const nbTrips = (appState.trips || []).length;
      statusEl.textContent = `Synchronisé (${nbTrips} voyage${nbTrips > 1 ? 's' : ''})`;
      statusEl.style.color = 'var(--success)';
      if (syncErrEl) syncErrEl.style.display = 'none';
    } else {
      statusEl.textContent = 'Connexion au Cloud…';
      statusEl.style.color = 'var(--text-muted)';
    }
  }

  function ouvrirModalAuth() {
    const errEl = document.getElementById('auth-error-msg');
    if (errEl) errEl.style.display = 'none';
    const syncErrEl = document.getElementById('auth-sync-error-msg');
    if (syncErrEl) syncErrEl.style.display = 'none';

    const user = window.ValiseFirebase?.getFirebaseUser?.();
    const loggedOutPanel = document.getElementById('auth-logged-out-panel');
    const loggedInPanel = document.getElementById('auth-logged-in-panel');

    if (user && loggedOutPanel && loggedInPanel) {
      loggedOutPanel.style.display = 'none';
      loggedInPanel.style.display = 'block';
      const emailEl = document.getElementById('auth-connected-email');
      if (emailEl) emailEl.textContent = user.email || user.displayName || user.uid;
      majStatutSyncModal();

      const tabsEl = document.getElementById('auth-role-tabs');
      const accountSec = document.getElementById('auth-account-section');
      const accessPanel = document.getElementById('auth-access-panel');
      const deniedEl = document.getElementById('auth-access-denied-msg');
      const btnTabAcc = document.getElementById('btn-auth-tab-account');
      const btnTabAccess = document.getElementById('btn-auth-tab-access');
      if (tabsEl) tabsEl.style.display = 'none';
      if (accountSec) accountSec.style.display = 'block';
      if (accessPanel) accessPanel.style.display = 'none';
      if (deniedEl) deniedEl.style.display = 'none';
      if (btnTabAcc) btnTabAcc.className = 'btn btn-primary btn-sm';
      if (btnTabAccess) btnTabAccess.className = 'btn btn-secondary btn-sm';

      if (user.email && window.ValiseFirebase?.initFirebase) {
        window.ValiseFirebase.initFirebase().then(async (fb) => {
          if (!fb || !window.ValiseFirebase?.resolveUserAccess) return;
          const access = await window.ValiseFirebase.resolveUserAccess(fb, 'checklist-valise', user.email);
          if (deniedEl) deniedEl.style.display = (!access.offline && !access.hasAppAccess) ? 'block' : 'none';
          if (tabsEl) tabsEl.style.display = access.isAdmin ? 'flex' : 'none';
          if (access.isAdmin && btnTabAcc && btnTabAccess && accountSec && accessPanel) {
            btnTabAcc.onclick = () => {
              accountSec.style.display = 'block';
              accessPanel.style.display = 'none';
              btnTabAcc.className = 'btn btn-primary btn-sm';
              btnTabAccess.className = 'btn btn-secondary btn-sm';
            };
            btnTabAccess.onclick = () => {
              accountSec.style.display = 'none';
              accessPanel.style.display = 'block';
              btnTabAcc.className = 'btn btn-secondary btn-sm';
              btnTabAccess.className = 'btn btn-primary btn-sm';
              window.ValiseFirebase.renderAccessControlPanel({
                container: accessPanel,
                fb,
                user,
                appId: 'checklist-valise',
                appName: 'Checklist Valise',
              });
            };
          }
        });
      }
    } else if (loggedOutPanel && loggedInPanel) {
      loggedOutPanel.style.display = 'block';
      loggedInPanel.style.display = 'none';
    }

    document.getElementById('modal-auth')?.classList.add('open');
  }

  function fermerModalAuth() {
    document.getElementById('modal-auth')?.classList.remove('open');
  }

  async function synchroniserMaintenant() {
    const btn = document.getElementById('btn-force-sync');
    const syncErrEl = document.getElementById('auth-sync-error-msg');
    if (syncErrEl) syncErrEl.style.display = 'none';
    if (btn) btn.disabled = true;
    majStatutSyncModal();
    try {
      await forcerSyncCloud();
      majStatutSyncModal();
      showToast('Synchronisation terminée');
    } catch (e) {
      majStatutSyncModal();
      if (syncErrEl) {
        syncErrEl.textContent = e?.message || 'Impossible de synchroniser.';
        syncErrEl.style.display = 'block';
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function soumettreAuthEmail(isRegister) {
    const email = document.getElementById('auth-email')?.value || '';
    const pwd = document.getElementById('auth-password')?.value || '';
    const errEl = document.getElementById('auth-error-msg');
    if (errEl) errEl.style.display = 'none';
    if (!window.ValiseFirebase) {
      if (errEl) {
        errEl.textContent = 'Module Cloud Firebase indisponible (mode hors-ligne ou script non chargé).';
        errEl.style.display = 'block';
      }
      return;
    }
    try {
      if (isRegister) {
        await window.ValiseFirebase.inscriptionEmail(email, pwd);
        showToast('Compte créé !');
      } else {
        await window.ValiseFirebase.connexionEmail(email, pwd);
        showToast('Connecté au Cloud');
      }
      fermerModalAuth();
    } catch (e) {
      if (errEl) {
        errEl.textContent = e.message || 'Erreur de connexion.';
        errEl.style.display = 'block';
      }
    }
  }

  async function soumettreAuthGoogle() {
    const errEl = document.getElementById('auth-error-msg');
    if (errEl) errEl.style.display = 'none';
    if (!window.ValiseFirebase) {
      if (errEl) {
        errEl.textContent = 'Module Cloud Firebase indisponible (mode hors-ligne ou script non chargé).';
        errEl.style.display = 'block';
      }
      return;
    }
    try {
      await window.ValiseFirebase.connexionGoogle();
      fermerModalAuth();
      showToast('Connecté avec Google');
    } catch (e) {
      if (errEl) {
        errEl.textContent = e.message || 'Erreur de connexion Google.';
        errEl.style.display = 'block';
      }
    }
  }

  const VALISE_APP_ID = 'checklist-valise';

  function afficherGateEtat(mode, info = {}) {
    const overlay = document.getElementById('auth-gate-overlay');
    const loadingEl = document.getElementById('auth-gate-loading');
    const loginEl = document.getElementById('auth-gate-login');
    const deniedEl = document.getElementById('auth-gate-denied');
    const offlineEl = document.getElementById('auth-gate-offline');
    if (!overlay) return;

    if (mode === 'allowed') {
      overlay.classList.remove('active');
      return;
    }

    overlay.classList.add('active');
    if (loadingEl) loadingEl.style.display = mode === 'loading' ? 'block' : 'none';
    if (loginEl) loginEl.style.display = mode === 'login' ? 'block' : 'none';
    if (deniedEl) deniedEl.style.display = mode === 'denied' ? 'block' : 'none';
    if (offlineEl) offlineEl.style.display = mode === 'offline' ? 'block' : 'none';

    if (mode === 'denied') {
      const emailEl = document.getElementById('gate-denied-email');
      if (emailEl) emailEl.textContent = info.email || '';
    } else if (mode === 'offline') {
      const msgEl = document.getElementById('gate-offline-msg');
      const emailEl = document.getElementById('gate-offline-email');
      if (msgEl) msgEl.textContent = info.message || 'Connexion Internet requise pour vérifier vos autorisations';
      if (emailEl) emailEl.textContent = info.email ? `Compte : ${info.email}` : '';
    }
  }

  async function verifierEtAppliquerGate(user, { background = false } = {}) {
    const vf = window.ValiseFirebase;
    if (!user) {
      vf?.arreterListenersFirestore?.();
      reinitialiserEtatCloud();
      afficherGateEtat('login');
      return false;
    }

    if (!background) {
      afficherGateEtat('loading');
    }

    const fb = await vf?.initFirebase?.();
    const res = vf?.resolveGateAccess
      ? await vf.resolveGateAccess(fb, VALISE_APP_ID, user)
      : { status: 'offline-blocked', message: 'Connexion Internet requise pour vérifier vos autorisations' };

    if (res.status === 'allowed') {
      afficherGateEtat('allowed');
      if (!background || cloudState.syncStatus === 'idle') {
        await activerSyncCloud();
      }
      majStatutSyncModal();
      render();
      return true;
    }

    vf?.arreterListenersFirestore?.();
    reinitialiserEtatCloud();

    if (res.status === 'denied') {
      afficherGateEtat('denied', { email: user.email });
    } else if (res.status === 'offline-blocked') {
      afficherGateEtat('offline', { email: user.email, message: res.message });
    } else {
      afficherGateEtat('login');
    }
    majStatutSyncModal();
    render();
    return false;
  }

  async function soumettreGateAuthEmail(isRegister) {
    const email = document.getElementById('gate-auth-email')?.value || '';
    const pwd = document.getElementById('gate-auth-password')?.value || '';
    const errEl = document.getElementById('gate-auth-error');
    if (errEl) errEl.style.display = 'none';
    if (!window.ValiseFirebase) {
      if (errEl) {
        errEl.textContent = 'Module Cloud Firebase indisponible.';
        errEl.style.display = 'block';
      }
      return;
    }
    try {
      if (isRegister) {
        await window.ValiseFirebase.inscriptionEmail(email, pwd);
      } else {
        await window.ValiseFirebase.connexionEmail(email, pwd);
      }
    } catch (e) {
      if (errEl) {
        errEl.textContent = e.message || 'Erreur de connexion.';
        errEl.style.display = 'block';
      }
    }
  }

  async function soumettreGateAuthGoogle() {
    const errEl = document.getElementById('gate-auth-error');
    if (errEl) errEl.style.display = 'none';
    if (!window.ValiseFirebase) {
      if (errEl) {
        errEl.textContent = 'Module Cloud Firebase indisponible.';
        errEl.style.display = 'block';
      }
      return;
    }
    try {
      await window.ValiseFirebase.connexionGoogle();
    } catch (e) {
      if (errEl) {
        errEl.textContent = e.message || 'Erreur de connexion Google.';
        errEl.style.display = 'block';
      }
    }
  }

  async function deconnexionGate() {
    window.ValiseFirebase?.clearCachedAuthAccess?.(VALISE_APP_ID);
    await window.ValiseFirebase?.deconnexionFirebase?.();
    reinitialiserEtatCloud();
    afficherGateEtat('login');
  }

  async function deconnexionCloud() {
    if (!confirm('Se déconnecter du compte Cloud ?')) return;
    window.ValiseFirebase?.clearCachedAuthAccess?.(VALISE_APP_ID);
    await window.ValiseFirebase?.deconnexionFirebase?.();
    reinitialiserEtatCloud();
    fermerModalAuth();
    afficherGateEtat('login');
    render();
    showToast('Déconnecté');
  }

  function majBoutonHeaderAuth(user) {
    const btnAuth = document.getElementById('btn-auth-header');
    if (!btnAuth) return;
    if (user) {
      const label = (user.email || user.displayName || 'Cloud').split('@')[0];
      btnAuth.innerHTML = SVG_USER;
      const textSpan = document.createElement('span');
      textSpan.className = 'btn-text account-label';
      textSpan.textContent = label;
      btnAuth.appendChild(textSpan);
      btnAuth.classList.add('is-authenticated');
      btnAuth.title = `Connecté : ${user.email || user.uid}`;
    } else {
      btnAuth.innerHTML = `${SVG_CLOUD}<span class="btn-text account-label">Connexion</span>`;
      btnAuth.classList.remove('is-authenticated');
      btnAuth.title = 'Se connecter au Cloud';
    }
  }

  function initAuthModule() {
    afficherGateEtat('loading');

    document.getElementById('btn-auth-login')?.addEventListener('click', () => soumettreAuthEmail(false));
    document.getElementById('btn-auth-register')?.addEventListener('click', () => soumettreAuthEmail(true));
    document.getElementById('btn-auth-google')?.addEventListener('click', soumettreAuthGoogle);
    document.getElementById('btn-force-sync')?.addEventListener('click', synchroniserMaintenant);
    document.getElementById('btn-auth-logout')?.addEventListener('click', deconnexionCloud);

    document.getElementById('btn-gate-login')?.addEventListener('click', () => soumettreGateAuthEmail(false));
    document.getElementById('btn-gate-register')?.addEventListener('click', () => soumettreGateAuthEmail(true));
    document.getElementById('btn-gate-google')?.addEventListener('click', soumettreGateAuthGoogle);
    document.getElementById('btn-gate-logout-denied')?.addEventListener('click', deconnexionGate);
    document.getElementById('btn-gate-logout-offline')?.addEventListener('click', deconnexionGate);
    document.getElementById('btn-gate-retry')?.addEventListener('click', () => {
      const user = window.ValiseFirebase?.getFirebaseUser?.() || null;
      verifierEtAppliquerGate(user, { background: false });
    });

    document.getElementById('auth-password')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        soumettreAuthEmail(false);
      }
    });

    document.getElementById('gate-auth-password')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        soumettreGateAuthEmail(false);
      }
    });

    window.addEventListener('online', () => {
      const user = window.ValiseFirebase?.getFirebaseUser?.();
      if (user) {
        verifierEtAppliquerGate(user, { background: true });
      }
    });

    const attachObserver = () => {
      if (!window.ValiseFirebase?.observerAuth) return false;
      window.ValiseFirebase.observerAuth(async (user) => {
        majBoutonHeaderAuth(user);
        await verifierEtAppliquerGate(user);
      });
      return true;
    };

    if (!attachObserver()) {
      window.addEventListener('load', () => attachObserver(), { once: true });
    }
  }

  function openOtherAppsModal() {
    const apps = [
      { nom: "L'Affinoir", desc: 'Charcuterie, salaisons & cave d\'affinage', url: 'https://quentinv1.github.io/app-charcuterie/' },
      { nom: 'Pêche France', desc: 'Réglementation, mailles, cartes & carnet de prises', url: 'https://quentinv1.github.io/app-peche/' },
      { nom: 'App Voyage', desc: 'Planificateur d\'itinéraire, carte & carnet de voyage', url: 'https://quentinv1.github.io/app-voyage/' },
      { nom: 'Budget Prévisionnel', desc: 'Budget du foyer, provisions & projections', url: 'https://quentinv1.github.io/budget-previsionnel/' },
      { nom: 'Cave à vin', desc: 'Stock de bouteilles, apogée & dégustations', url: 'https://quentinv1.github.io/cave-a-vin/' },
      { nom: 'Livre de recettes', desc: 'Recettes, planning semaine & liste de courses', url: 'https://quentinv1.github.io/livre-recettes/' },
      { nom: 'Suivi Chasse', desc: 'Carnet de sorties, carte & album trophées', url: 'https://quentinv1.github.io/suivi-chasse/' },
      { nom: 'Travaux Maison', desc: 'Plan 2D/3D, courses, tâches & entretien', url: 'https://quentinv1.github.io/travaux-maison/' },
    ];
    const listEl = document.getElementById('otherAppsList');
    const modal = document.getElementById('otherAppsModal');
    if (!listEl || !modal) return;
    listEl.innerHTML = apps.map(app => `
      <a href="${escapeHtml(app.url)}" target="_blank" rel="noopener noreferrer"
         style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 12px; border:1px solid var(--border); border-radius:var(--radius-md); text-decoration:none; color:var(--text); background:var(--bg-subtle);">
        <div style="min-width:0;">
          <div style="font-weight:700; font-size:0.88rem;">${escapeHtml(app.nom)}</div>
          <div style="font-size:0.76rem; color:var(--text-muted);">${escapeHtml(app.desc)}</div>
        </div>
        <span style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; font-weight:600; color:var(--accent); white-space:nowrap;">
          Ouvrir
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </span>
      </a>
    `).join('');
    modal.classList.add('open');
  }
})();
