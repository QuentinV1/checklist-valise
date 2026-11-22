// Module de gestion des accès & rôles (hub_global_whitelist + hub_apps/{appId}/members)

export const ROOT_ADMIN_EMAIL = 'quentin.vaslin@gmail.com';

export const INITIAL_GLOBAL_WHITELIST = [
  { email: 'quentin.vaslin@gmail.com', displayName: 'Quentin', role: 'admin' },
  { email: 'vaslin.pascal@wanadoo.fr', displayName: 'Pascal', role: 'user' },
  { email: 'pa.vaslin@bouygues-construction.com', displayName: 'PA Vaslin', role: 'user' },
  { email: 'clementvaslin@gmail.com', displayName: 'Clément', role: 'user' },
  { email: 'delisle-margaux@hotmail.com', displayName: 'Margaux', role: 'user' },
  { email: 'mar9aux-delisle@hotmail.fr', displayName: 'Margaux (alt)', role: 'user' },
  { email: 'vaslin.muriel45@gmail.com', displayName: 'Muriel', role: 'user' },
];

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmailFormat(email) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(email || '').trim());
}

const AC_SVG_CHECK = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
const AC_SVG_ARROW_RIGHT = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
const AC_SVG_EDIT = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`;
const AC_SVG_CLOSE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const AUTH_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function getAuthCacheKey(appId) {
  return `hub_auth_cache_${appId}`;
}

export function getCachedAuthAccess(appId, user) {
  if (!appId || !user?.uid || !user?.email) return null;
  try {
    const raw = localStorage.getItem(getAuthCacheKey(appId));
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached || cached.hasAppAccess !== true) return null;
    if (cached.appId !== appId) return null;
    if (cached.uid !== user.uid) return null;
    if (normalizeEmail(cached.email) !== normalizeEmail(user.email)) return null;
    if (typeof cached.verifiedAt !== 'number') return null;
    const age = Date.now() - cached.verifiedAt;
    if (age < 0 || age > AUTH_CACHE_TTL_MS) return null;
    return cached;
  } catch (_) {
    return null;
  }
}

export function saveCachedAuthAccess(appId, user, access) {
  if (!appId || !user?.uid || !user?.email || !access?.hasAppAccess) return;
  try {
    localStorage.setItem(getAuthCacheKey(appId), JSON.stringify({
      uid: user.uid,
      email: normalizeEmail(user.email),
      appId,
      hasAppAccess: true,
      isAdmin: !!access.isAdmin,
      isGlobalAdmin: !!access.isGlobalAdmin,
      isAppAdmin: !!access.isAppAdmin,
      role: access.role || (access.isAdmin ? 'admin' : 'user'),
      appConfigured: !!access.appConfigured,
      verifiedAt: Date.now(),
    }));
  } catch (_) {}
}

export function clearCachedAuthAccess(appId) {
  if (!appId) return;
  try {
    localStorage.removeItem(getAuthCacheKey(appId));
  } catch (_) {}
}

function isOfflineFirestoreError(err) {
  const code = err?.code || '';
  const msg = String(err?.message || '').toLowerCase();
  return (
    (typeof navigator !== 'undefined' && !navigator.onLine) ||
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    msg.includes('offline') ||
    msg.includes('network') ||
    msg.includes('failed to fetch')
  );
}

export async function resolveUserAccess(fb, appId, userEmail) {
  const email = normalizeEmail(userEmail);
  const offlineResult = { isGlobalAdmin: false, isAppAdmin: false, isAdmin: false, hasAppAccess: false, appConfigured: false, role: null, offline: true };
  if (!fb?.db || !fb?.fsMod || !email) {
    return { isGlobalAdmin: false, isAppAdmin: false, isAdmin: false, hasAppAccess: false, appConfigured: false, role: null, offline: typeof navigator !== 'undefined' ? !navigator.onLine : false };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return offlineResult;
  }
  const { doc } = fb.fsMod;
  const readDoc = fb.fsMod.getDocFromServer || fb.fsMod.getDoc;
  const db = fb.db;
  const isRoot = email === ROOT_ADMIN_EMAIL;

  let isGlobalAdmin = isRoot;
  let inGlobal = isRoot;
  try {
    const gSnap = await readDoc(doc(db, 'hub_global_whitelist', email));
    if (gSnap.exists()) {
      inGlobal = true;
      if (gSnap.data()?.role === 'admin') isGlobalAdmin = true;
    }
  } catch (err) {
    if (isOfflineFirestoreError(err)) return offlineResult;
  }

  let appConfigured = false;
  try {
    const aSnap = await readDoc(doc(db, 'hub_apps', appId));
    appConfigured = aSnap.exists();
  } catch (err) {
    if (isOfflineFirestoreError(err)) return offlineResult;
  }

  let isAppAdmin = isGlobalAdmin;
  let inApp = isGlobalAdmin;
  try {
    const mSnap = await readDoc(doc(db, 'hub_apps', appId, 'members', email));
    if (mSnap.exists()) {
      inApp = true;
      if (mSnap.data()?.role === 'admin') isAppAdmin = true;
    }
  } catch (err) {
    if (isOfflineFirestoreError(err)) return offlineResult;
  }

  const isAdmin = isGlobalAdmin || isAppAdmin;
  let allowLegacyFallback = false;
  if (!isAdmin && !appConfigured && !inGlobal) {
    let globalSeeded = false;
    try {
      const rootSnap = await readDoc(doc(db, 'hub_global_whitelist', ROOT_ADMIN_EMAIL));
      globalSeeded = rootSnap.exists();
    } catch (err) {
      if (isOfflineFirestoreError(err)) return offlineResult;
      globalSeeded = true;
    }
    if (!globalSeeded) {
      allowLegacyFallback = INITIAL_GLOBAL_WHITELIST.some((u) => u.email === email);
    }
  }

  const hasAppAccess = isAdmin || (appConfigured ? inApp : inGlobal || allowLegacyFallback);

  return {
    isGlobalAdmin,
    isAppAdmin,
    isAdmin,
    hasAppAccess,
    appConfigured,
    role: isAdmin ? 'admin' : hasAppAccess ? 'user' : null,
    offline: false,
  };
}

export async function resolveGateAccess(fb, appId, user) {
  if (!user || !user.email) {
    return { status: 'unauthenticated', access: null };
  }
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  if (!isOnline || !fb?.db || !fb?.fsMod) {
    const cached = getCachedAuthAccess(appId, user);
    if (cached) {
      return { status: 'allowed', offline: true, fromCache: true, access: cached };
    }
    return {
      status: 'offline-blocked',
      message: 'Connexion Internet requise pour vérifier vos autorisations',
      access: null,
    };
  }

  const access = await resolveUserAccess(fb, appId, user.email);
  if (access.offline) {
    const cached = getCachedAuthAccess(appId, user);
    if (cached) {
      return { status: 'allowed', offline: true, fromCache: true, access: cached };
    }
    return {
      status: 'offline-blocked',
      message: 'Connexion Internet requise pour vérifier vos autorisations',
      access: null,
    };
  }

  if (access.hasAppAccess) {
    saveCachedAuthAccess(appId, user, access);
    return { status: 'allowed', offline: false, fromCache: false, access };
  }

  clearCachedAuthAccess(appId);
  return { status: 'denied', offline: false, fromCache: false, access };
}

async function seedInitialGlobalWhitelistIfEmpty(fb) {
  const { collection, doc, getDocs, writeBatch } = fb.fsMod;
  const snap = await getDocs(collection(fb.db, 'hub_global_whitelist'));
  if (!snap.empty) return;
  const now = new Date().toISOString();
  const batch = writeBatch(fb.db);
  for (const item of INITIAL_GLOBAL_WHITELIST) {
    batch.set(doc(fb.db, 'hub_global_whitelist', item.email), {
      email: item.email,
      displayName: item.displayName,
      role: item.role,
      createdAt: now,
      updatedAt: now,
    });
  }
  await batch.commit();
}

async function listGlobalWhitelist(fb) {
  const { collection, getDocs } = fb.fsMod;
  const snap = await getDocs(collection(fb.db, 'hub_global_whitelist'));
  const items = [];
  snap.forEach((d) => {
    const data = d.data() || {};
    items.push({
      email: normalizeEmail(data.email || d.id),
      displayName: data.displayName || '',
      role: data.role === 'admin' ? 'admin' : 'user',
    });
  });
  return items.sort((a, b) => (a.role !== b.role ? (a.role === 'admin' ? -1 : 1) : a.email.localeCompare(b.email)));
}

async function listAppMembers(fb, appId) {
  const { collection, getDocs } = fb.fsMod;
  const snap = await getDocs(collection(fb.db, 'hub_apps', appId, 'members'));
  const items = [];
  snap.forEach((d) => {
    const data = d.data() || {};
    items.push({
      email: normalizeEmail(data.email || d.id),
      displayName: data.displayName || '',
      role: data.role === 'admin' ? 'admin' : 'user',
    });
  });
  return items.sort((a, b) => (a.role !== b.role ? (a.role === 'admin' ? -1 : 1) : a.email.localeCompare(b.email)));
}

async function ensureAppInitialized(fb, appId, appName, adminEmail) {
  const { doc, getDoc, setDoc } = fb.fsMod;
  const now = new Date().toISOString();
  const appRef = doc(fb.db, 'hub_apps', appId);
  const appSnap = await getDoc(appRef);
  if (!appSnap.exists()) {
    await setDoc(appRef, { appId, name: appName, updatedAt: now, updatedBy: normalizeEmail(adminEmail) });
  }
  const rootRef = doc(fb.db, 'hub_apps', appId, 'members', ROOT_ADMIN_EMAIL);
  const rootSnap = await getDoc(rootRef);
  if (!rootSnap.exists()) {
    await setDoc(rootRef, { email: ROOT_ADMIN_EMAIL, displayName: 'Quentin', role: 'admin', addedAt: now, updatedAt: now });
  }
}

export async function renderAccessControlPanel({ container, fb, user, appId, appName }) {
  if (!container || !fb?.db || !user?.email) return;
  container.innerHTML = '<div style="padding:16px;text-align:center;font-size:0.8rem;color:var(--text-muted,#888);">Chargement des accès…</div>';

  const state = {
    access: null,
    globalList: [],
    appMembers: [],
    appActive: false,
    editingEmail: null,
    error: null,
    info: null,
  };

  async function refresh() {
    state.access = await resolveUserAccess(fb, appId, user.email);
    if (!state.access.isAdmin) {
      container.innerHTML = '';
      return;
    }
    if (state.access.isGlobalAdmin) {
      await seedInitialGlobalWhitelistIfEmpty(fb);
    }
    const { doc, getDoc } = fb.fsMod;
    const [globals, appSnap, members] = await Promise.all([
      listGlobalWhitelist(fb),
      getDoc(doc(fb.db, 'hub_apps', appId)),
      listAppMembers(fb, appId),
    ]);
    state.globalList = globals;
    state.appActive = appSnap.exists();
    state.appMembers = members;
    draw();
  }

  function draw() {
    if (!state.access?.isAdmin) {
      container.innerHTML = '';
      return;
    }
    const appSet = new Set(state.appMembers.map((m) => m.email));

    const boxStyle = 'border:1px solid var(--border,rgba(128,128,128,0.25));border-radius:10px;padding:10px;margin-bottom:10px;background:var(--bg-subtle,rgba(128,128,128,0.06));';
    const rowStyle = 'display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px;padding:7px 8px;border-radius:8px;border:1px solid var(--border,rgba(128,128,128,0.2));margin-bottom:6px;';
    const inputStyle = 'padding:5px 8px;border-radius:6px;border:1px solid var(--border,rgba(128,128,128,0.3));background:var(--bg,transparent);color:inherit;font-size:0.78rem;';

    let html = '';
    if (state.error) {
      html += `<div style="padding:7px 10px;border-radius:8px;background:rgba(220,38,38,0.12);color:#ef4444;font-size:0.78rem;margin-bottom:8px;">${escapeHtml(state.error)}</div>`;
    }
    if (state.info) {
      html += `<div style="padding:7px 10px;border-radius:8px;background:rgba(16,185,129,0.12);color:#10b981;font-size:0.78rem;margin-bottom:8px;">${escapeHtml(state.info)}</div>`;
    }

    html += `<div style="${boxStyle}">`;
    html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">`;
    html += `<strong style="font-size:0.82rem;">Whitelist de l'app (${state.appMembers.length})</strong>`;
    if (!state.appActive) {
      html += `<button type="button" class="btn btn-primary btn-sm" data-ac-action="activate-app">Activer la liste dédiée</button>`;
    }
    html += `</div>`;
    if (!state.appActive) {
      html += `<div style="font-size:0.74rem;color:var(--text-muted,#888);margin-bottom:8px;">Mode hérité actif : tous les e-mails globaux ont accès. Migrez un membre ci-dessous pour restreindre l'accès à cette app.</div>`;
    }
    if (state.appMembers.length === 0) {
      html += `<div style="font-size:0.76rem;color:var(--text-muted,#888);">Aucun membre spécifique configuré.</div>`;
    } else {
      for (const m of state.appMembers) {
        const isRoot = m.email === ROOT_ADMIN_EMAIL;
        html += `<div style="${rowStyle}">`;
        html += `<div style="min-width:0;flex:1;">`;
        html += `<div style="font-size:0.8rem;font-weight:600;word-break:break-all;">${escapeHtml(m.displayName || m.email)}</div>`;
        if (m.displayName) html += `<div style="font-size:0.72rem;color:var(--text-muted,#888);word-break:break-all;">${escapeHtml(m.email)}</div>`;
        html += `</div>`;
        html += `<div style="display:flex;align-items:center;gap:6px;">`;
        html += `<select data-ac-role="${escapeHtml(m.email)}" ${isRoot ? 'disabled' : ''} style="${inputStyle}">`;
        html += `<option value="user" ${m.role === 'user' ? 'selected' : ''}>Utilisateur</option>`;
        html += `<option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Administrateur</option>`;
        html += `</select>`;
        html += `<button type="button" class="btn btn-danger btn-sm" data-ac-remove-app="${escapeHtml(m.email)}" ${isRoot ? 'disabled style="opacity:0.4;"' : ''}>Retirer</button>`;
        html += `</div></div>`;
      }
    }
    html += `</div>`;

    html += `<div style="${boxStyle}">`;
    html += `<div style="margin-bottom:8px;"><strong style="font-size:0.82rem;">Whitelist globale (${state.globalList.length})</strong></div>`;
    if (state.access.isGlobalAdmin) {
      html += `<form data-ac-form="add-global" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">`;
      html += `<input type="email" required placeholder="email@exemple.fr" data-ac-input="new-email" style="${inputStyle}flex:1;min-width:140px;" />`;
      html += `<input type="text" placeholder="Nom" data-ac-input="new-name" style="${inputStyle}width:95px;" />`;
      html += `<select data-ac-input="new-role" style="${inputStyle}"><option value="user">Utilisateur</option><option value="admin">Admin</option></select>`;
      html += `<button type="submit" class="btn btn-primary btn-sm">+ Ajouter</button>`;
      html += `</form>`;
    }

    for (const g of state.globalList) {
      const isRoot = g.email === ROOT_ADMIN_EMAIL;
      const inApp = appSet.has(g.email);
      if (state.editingEmail === g.email) {
        html += `<div style="${rowStyle}flex-direction:column;align-items:stretch;">`;
        html += `<div style="display:flex;flex-wrap:wrap;gap:6px;">`;
        html += `<input type="email" value="${escapeHtml(g.email)}" ${isRoot ? 'disabled' : ''} data-ac-edit="email" style="${inputStyle}flex:1;min-width:140px;" />`;
        html += `<input type="text" value="${escapeHtml(g.displayName || '')}" placeholder="Nom" data-ac-edit="name" style="${inputStyle}width:100px;" />`;
        html += `<select data-ac-edit="role" ${isRoot ? 'disabled' : ''} style="${inputStyle}"><option value="user" ${g.role === 'user' ? 'selected' : ''}>Utilisateur</option><option value="admin" ${g.role === 'admin' ? 'selected' : ''}>Administrateur</option></select>`;
        html += `</div>`;
        html += `<div style="display:flex;justify-content:flex-end;gap:6px;margin-top:6px;">`;
        html += `<button type="button" class="btn btn-secondary btn-sm" data-ac-edit-cancel>Annuler</button>`;
        html += `<button type="button" class="btn btn-primary btn-sm" data-ac-edit-save="${escapeHtml(g.email)}">Enregistrer</button>`;
        html += `</div></div>`;
        continue;
      }

      html += `<div style="${rowStyle}">`;
      html += `<div style="min-width:0;flex:1;">`;
      html += `<div style="font-size:0.8rem;font-weight:600;word-break:break-all;">${escapeHtml(g.displayName || g.email)} <span style="font-size:0.68rem;padding:1px 6px;border-radius:99px;background:rgba(14,165,233,0.15);color:#0ea5e9;">${g.role === 'admin' ? 'Admin' : 'Utilisateur'}</span></div>`;
      if (g.displayName) html += `<div style="font-size:0.72rem;color:var(--text-muted,#888);word-break:break-all;">${escapeHtml(g.email)}</div>`;
      html += `</div>`;
      html += `<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">`;
      if (inApp) {
        html += `<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.72rem;color:#10b981;font-weight:600;padding:2px 6px;">${AC_SVG_CHECK} Dans l'app</span>`;
      } else {
        html += `<button type="button" class="btn btn-primary btn-sm" style="display:inline-flex;align-items:center;gap:4px;" data-ac-migrate="${escapeHtml(g.email)}">Migrer ${AC_SVG_ARROW_RIGHT}</button>`;
      }
      if (state.access.isGlobalAdmin) {
        html += `<button type="button" class="btn btn-secondary btn-sm" data-ac-edit-start="${escapeHtml(g.email)}" title="Modifier" aria-label="Modifier">${AC_SVG_EDIT}</button>`;
        html += `<button type="button" class="btn btn-danger btn-sm" data-ac-delete-global="${escapeHtml(g.email)}" title="Supprimer" aria-label="Supprimer" ${isRoot ? 'disabled style="opacity:0.4;"' : ''}>${AC_SVG_CLOSE}</button>`;
      }
      html += `</div></div>`;
    }
    html += `</div>`;

    container.innerHTML = html;
    bindEvents();
  }

  function bindEvents() {
    const { doc, getDoc, setDoc, deleteDoc } = fb.fsMod;

    container.querySelector('[data-ac-action="activate-app"]')?.addEventListener('click', async () => {
      try {
        state.error = null;
        await ensureAppInitialized(fb, appId, appName, user.email);
        state.info = `Liste dédiée activée pour ${appName}.`;
        await refresh();
      } catch (err) {
        state.error = err?.message || 'Erreur activation.';
        draw();
      }
    });

    container.querySelectorAll('[data-ac-role]').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const email = sel.getAttribute('data-ac-role');
        const role = sel.value === 'admin' ? 'admin' : 'user';
        try {
          state.error = null;
          await setDoc(doc(fb.db, 'hub_apps', appId, 'members', email), { role, updatedAt: new Date().toISOString() }, { merge: true });
          state.info = `Rôle de ${email} mis à jour.`;
          await refresh();
        } catch (err) {
          state.error = err?.message || 'Erreur mise à jour rôle.';
          draw();
        }
      });
    });

    container.querySelectorAll('[data-ac-remove-app]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const email = btn.getAttribute('data-ac-remove-app');
        try {
          state.error = null;
          await deleteDoc(doc(fb.db, 'hub_apps', appId, 'members', email));
          state.info = `${email} retiré de ${appName}.`;
          await refresh();
        } catch (err) {
          state.error = err?.message || 'Erreur suppression.';
          draw();
        }
      });
    });

    container.querySelector('[data-ac-form="add-global"]')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = normalizeEmail(container.querySelector('[data-ac-input="new-email"]')?.value);
      const displayName = (container.querySelector('[data-ac-input="new-name"]')?.value || '').trim() || null;
      const role = container.querySelector('[data-ac-input="new-role"]')?.value === 'admin' ? 'admin' : 'user';
      if (!isValidEmailFormat(email)) {
        state.error = 'Adresse e-mail invalide.';
        draw();
        return;
      }
      try {
        state.error = null;
        const now = new Date().toISOString();
        const ref = doc(fb.db, 'hub_global_whitelist', email);
        const snap = await getDoc(ref);
        await setDoc(ref, {
          email,
          displayName,
          role: email === ROOT_ADMIN_EMAIL ? 'admin' : role,
          createdAt: snap.exists() ? snap.data()?.createdAt || now : now,
          updatedAt: now,
        }, { merge: true });
        state.info = `${email} ajouté à la liste globale.`;
        await refresh();
      } catch (err) {
        state.error = err?.message || 'Erreur ajout global.';
        draw();
      }
    });

    container.querySelectorAll('[data-ac-migrate]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const email = btn.getAttribute('data-ac-migrate');
        const entry = state.globalList.find((g) => g.email === email);
        if (!entry) return;
        try {
          state.error = null;
          await ensureAppInitialized(fb, appId, appName, user.email);
          const now = new Date().toISOString();
          await setDoc(doc(fb.db, 'hub_apps', appId, 'members', email), {
            email,
            displayName: entry.displayName || null,
            role: email === ROOT_ADMIN_EMAIL ? 'admin' : entry.role,
            addedAt: now,
            updatedAt: now,
          }, { merge: true });
          state.info = `${email} migré vers ${appName}.`;
          await refresh();
        } catch (err) {
          state.error = err?.message || 'Erreur migration.';
          draw();
        }
      });
    });

    container.querySelectorAll('[data-ac-edit-start]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.editingEmail = btn.getAttribute('data-ac-edit-start');
        state.error = null;
        state.info = null;
        draw();
      });
    });

    container.querySelector('[data-ac-edit-cancel]')?.addEventListener('click', () => {
      state.editingEmail = null;
      draw();
    });

    container.querySelector('[data-ac-edit-save]')?.addEventListener('click', async (e) => {
      const oldEmail = e.currentTarget.getAttribute('data-ac-edit-save');
      const newEmail = normalizeEmail(container.querySelector('[data-ac-edit="email"]')?.value);
      const displayName = (container.querySelector('[data-ac-edit="name"]')?.value || '').trim() || null;
      const role = container.querySelector('[data-ac-edit="role"]')?.value === 'admin' ? 'admin' : 'user';
      if (!isValidEmailFormat(newEmail)) {
        state.error = 'Adresse e-mail invalide.';
        draw();
        return;
      }
      try {
        state.error = null;
        const now = new Date().toISOString();
        const finalRole = newEmail === ROOT_ADMIN_EMAIL ? 'admin' : role;
        if (oldEmail === newEmail) {
          await setDoc(doc(fb.db, 'hub_global_whitelist', oldEmail), { email: oldEmail, displayName, role: finalRole, updatedAt: now }, { merge: true });
        } else {
          const oldSnap = await getDoc(doc(fb.db, 'hub_global_whitelist', oldEmail));
          await setDoc(doc(fb.db, 'hub_global_whitelist', newEmail), {
            email: newEmail,
            displayName,
            role: finalRole,
            createdAt: oldSnap.exists() ? oldSnap.data()?.createdAt || now : now,
            updatedAt: now,
          });
          await deleteDoc(doc(fb.db, 'hub_global_whitelist', oldEmail));
          const oldMem = await getDoc(doc(fb.db, 'hub_apps', appId, 'members', oldEmail));
          if (oldMem.exists()) {
            await setDoc(doc(fb.db, 'hub_apps', appId, 'members', newEmail), {
              email: newEmail,
              displayName,
              role: oldMem.data()?.role === 'admin' ? 'admin' : 'user',
              addedAt: oldMem.data()?.addedAt || now,
              updatedAt: now,
            });
            await deleteDoc(doc(fb.db, 'hub_apps', appId, 'members', oldEmail));
          }
        }
        state.editingEmail = null;
        state.info = 'Membre global mis à jour.';
        await refresh();
      } catch (err) {
        state.error = err?.message || 'Erreur modification.';
        draw();
      }
    });

    container.querySelectorAll('[data-ac-delete-global]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const email = btn.getAttribute('data-ac-delete-global');
        if (!window.confirm(`Supprimer ${email} de la whitelist globale ?`)) return;
        try {
          state.error = null;
          await deleteDoc(doc(fb.db, 'hub_global_whitelist', email));
          await deleteDoc(doc(fb.db, 'hub_apps', appId, 'members', email)).catch(() => {});
          state.info = `${email} supprimé.`;
          await refresh();
        } catch (err) {
          state.error = err?.message || 'Erreur suppression.';
          draw();
        }
      });
    });
  }

  try {
    await refresh();
  } catch (err) {
    container.innerHTML = `<div style="padding:12px;color:#ef4444;font-size:0.8rem;">${escapeHtml(err?.message || 'Erreur chargement des accès.')}</div>`;
  }
}
