// Synchronisation Cloud Firebase (Auth + Cloud Firestore avec persistance hors-ligne)
const FIREBASE_SDK_VERSION = '11.4.0';

function isConfigReady(cfg) {
  if (!cfg || typeof cfg !== 'object') return false;
  const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
  return required.every((k) => {
    const val = String(cfg[k] || '').trim();
    return Boolean(val) && !val.startsWith('YOUR_');
  });
}

function translateAuthError(error) {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Adresse e-mail invalide.';
    case 'auth/user-disabled':
      return 'Ce compte a été désactivé.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou mot de passe incorrect.';
    case 'auth/email-already-in-use':
      return 'Un compte existe déjà avec cette adresse e-mail.';
    case 'auth/weak-password':
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    case 'auth/network-request-failed':
      return 'Connexion réseau impossible. Vérifiez votre accès internet.';
    case 'auth/popup-closed-by-user':
      return 'Connexion annulée.';
    case 'auth/unauthorized-domain':
      return 'Domaine non autorisé dans Firebase Console (Authentication > Settings > Authorized domains).';
    case 'auth/credential-already-in-use':
      return 'Ce compte Google ou e-mail est déjà associé à un autre utilisateur.';
    case 'auth/requires-recent-login':
      return 'Veuillez vous reconnecter pour effectuer cette action.';
    default:
      return error?.message || 'Erreur d’authentification.';
  }
}

const listeners = new Set();
let auth = null;
let db = null;
let sdk = null;
let currentUser = null;
let syncStatus = 'local'; // 'local' | 'syncing' | 'synced' | 'offline' | 'error'
let unsubscribeSnapshot = null;
let pushTimer = null;
let pendingState = null;
let lastLocalWriteAt = 0;
let initialCloudSyncDoneForUid = null;
let knownCloudDocExists = false;
let initialized = false;
let initPromise = null;

function notify() {
  const snapshot = getSnapshot();
  listeners.forEach((fn) => {
    try { fn(snapshot); } catch (e) { console.warn('ValiseCloud listener error:', e); }
  });
}

function setSyncStatus(next) {
  if (syncStatus !== next) {
    syncStatus = next;
    notify();
  }
}

function formatUser(user) {
  if (!user) return null;
  const providerId = user.isAnonymous
    ? 'anonymous'
    : (user.providerData?.[0]?.providerId || 'password');
  return {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Invité'),
    photoURL: user.photoURL || null,
    isAnonymous: Boolean(user.isAnonymous),
    providerId
  };
}

function getSnapshot() {
  return {
    configured: isConfigReady(window.VALISE_FIREBASE_CONFIG),
    initialized,
    user: formatUser(currentUser),
    syncStatus,
    online: navigator.onLine
  };
}

function stopFirestoreListener() {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  pendingState = null;
  initialCloudSyncDoneForUid = null;
  knownCloudDocExists = false;
}

function getUserAppDocRef(user) {
  return sdk.doc(db, 'users', user.uid, 'apps', 'checklist_valise');
}

function buildFirestorePayload(state, includeCreatedAt = false) {
  const docData = {
    title: 'Checklist Valise',
    updatedAt: sdk.serverTimestamp(),
    payload: {
      trips: Array.isArray(state.trips) ? state.trips : [],
      customTemplates: Array.isArray(state.customTemplates) ? state.customTemplates : [],
      activeTripId: state.activeTripId || null,
      viewMode: state.viewMode || 'chrono',
      filterPhase: state.filterPhase || 'all',
      filterBaggage: state.filterBaggage || 'all',
      filterStatus: state.filterStatus || 'all',
      collapsedSections: state.collapsedSections && typeof state.collapsedSections === 'object'
        ? state.collapsedSections
        : {},
      updatedAtMs: Date.now()
    }
  };
  if (includeCreatedAt) {
    docData.createdAt = sdk.serverTimestamp();
  }
  return docData;
}

function startUserSync(user) {
  if (!db || !sdk || !user) return;
  stopFirestoreListener();

  const userRef = getUserAppDocRef(user);
  setSyncStatus(navigator.onLine ? 'syncing' : 'offline');

  unsubscribeSnapshot = sdk.onSnapshot(
    userRef,
    { includeMetadataChanges: true },
    async (docSnap) => {
      const isInitialForUser = initialCloudSyncDoneForUid !== user.uid;
      const fromCache = docSnap.metadata.fromCache;
      const hasPending = docSnap.metadata.hasPendingWrites;

      if (docSnap.exists()) {
        knownCloudDocExists = true;
      }

      if (hasPending) {
        setSyncStatus(navigator.onLine ? 'syncing' : 'offline');
        return;
      }

      const rawData = docSnap.exists() ? docSnap.data() : null;
      const cloudData = rawData?.payload || null;

      if (isInitialForUser) {
        initialCloudSyncDoneForUid = user.uid;
        if (window.ValiseApp && typeof window.ValiseApp.onCloudInitialData === 'function') {
          const mergedState = window.ValiseApp.onCloudInitialData(formatUser(user), cloudData);
          if (mergedState) {
            await writeToFirestoreNow(mergedState, user);
          }
        }
      } else if (cloudData) {
        const remoteTs = Number(cloudData.updatedAtMs || rawData?.updatedAt?.toMillis?.() || 0);
        if (remoteTs > lastLocalWriteAt + 500) {
          window.ValiseApp?.onCloudRemoteUpdate?.(formatUser(user), cloudData);
        }
      }

      setSyncStatus(!navigator.onLine || fromCache ? (navigator.onLine ? 'synced' : 'offline') : 'synced');
    },
    (err) => {
      console.warn('Erreur Firestore onSnapshot:', err);
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
    }
  );
}

async function writeToFirestoreNow(state, user = currentUser) {
  if (!db || !sdk || !user || !state) return;
  const userRef = getUserAppDocRef(user);
  const payload = buildFirestorePayload(state, !knownCloudDocExists);
  lastLocalWriteAt = payload.payload.updatedAtMs;
  setSyncStatus(navigator.onLine ? 'syncing' : 'offline');
  try {
    await sdk.setDoc(userRef, payload, { merge: true });
    knownCloudDocExists = true;
    setSyncStatus(navigator.onLine ? 'synced' : 'offline');
  } catch (err) {
    console.warn('Erreur écriture Firestore:', err);
    setSyncStatus(navigator.onLine ? 'error' : 'offline');
  }
}

async function init() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const cfg = window.VALISE_FIREBASE_CONFIG;
    if (!isConfigReady(cfg) || window.location.protocol === 'file:') {
      initialized = true;
      setSyncStatus('local');
      notify();
      return;
    }

    try {
      const baseUrl = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
      const [appMod, authMod, fsMod] = await Promise.all([
        import(`${baseUrl}/firebase-app.js`),
        import(`${baseUrl}/firebase-auth.js`),
        import(`${baseUrl}/firebase-firestore.js`)
      ]);

      sdk = { ...appMod, ...authMod, ...fsMod };
      const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(cfg);
      auth = authMod.getAuth(app);

      try {
        db = fsMod.initializeFirestore(app, {
          localCache: fsMod.persistentLocalCache({
            tabManager: fsMod.persistentMultipleTabManager()
          })
        });
      } catch (cacheErr) {
        db = fsMod.getFirestore(app);
      }

      // Gère le retour d'une redirection Google OAuth si utilisée
      authMod.getRedirectResult(auth).catch((err) => {
        console.warn('Erreur getRedirectResult:', err);
      });

      authMod.onAuthStateChanged(auth, (user) => {
        const prevUid = currentUser?.uid || null;
        currentUser = user || null;
        if (currentUser) {
          if (prevUid !== currentUser.uid) {
            startUserSync(currentUser);
          }
        } else {
          stopFirestoreListener();
          setSyncStatus('local');
          window.ValiseApp?.onCloudSignedOut?.();
        }
        notify();
      });

      initialized = true;
      notify();
    } catch (err) {
      console.warn('Firebase SDK indisponible (mode hors-ligne local):', err);
      initialized = true;
      setSyncStatus('local');
      notify();
    }
  })();

  return initPromise;
}

window.addEventListener('online', () => {
  if (currentUser) setSyncStatus('syncing');
  notify();
});

window.addEventListener('offline', () => {
  if (currentUser) setSyncStatus('offline');
  notify();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && pendingState && currentUser) {
    const toFlush = pendingState;
    pendingState = null;
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
    writeToFirestoreNow(toFlush, currentUser);
  }
});

window.ValiseCloud = {
  init,
  getSnapshot,
  isConfigured: () => isConfigReady(window.VALISE_FIREBASE_CONFIG),
  getUser: () => formatUser(currentUser),
  onChange(fn) {
    if (typeof fn === 'function') listeners.add(fn);
    return () => listeners.delete(fn);
  },

  pushState(state) {
    if (!currentUser || !db || !sdk) return;
    pendingState = state;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      const toFlush = pendingState;
      pendingState = null;
      pushTimer = null;
      if (toFlush && currentUser) {
        writeToFirestoreNow(toFlush, currentUser);
      }
    }, 400);
  },

  async forceSync(state) {
    await init();
    if (!currentUser) throw new Error('Aucun compte connecté.');
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
    pendingState = null;
    await writeToFirestoreNow(state, currentUser);
  },

  async signInWithEmail(email, password) {
    await init();
    if (!auth || !sdk) throw new Error('Firebase non configuré.');
    try {
      const cred = await sdk.signInWithEmailAndPassword(auth, email.trim(), password);
      return formatUser(cred.user);
    } catch (err) {
      throw new Error(translateAuthError(err));
    }
  },

  async signUpWithEmail(email, password, displayName = '') {
    await init();
    if (!auth || !sdk) throw new Error('Firebase non configuré.');
    try {
      let cred;
      if (currentUser && currentUser.isAnonymous) {
        const credential = sdk.EmailAuthProvider.credential(email.trim(), password);
        cred = await sdk.linkWithCredential(currentUser, credential);
      } else {
        cred = await sdk.createUserWithEmailAndPassword(auth, email.trim(), password);
      }
      if (displayName.trim()) {
        await sdk.updateProfile(cred.user, { displayName: displayName.trim() });
      }
      return formatUser(cred.user);
    } catch (err) {
      throw new Error(translateAuthError(err));
    }
  },

  async sendPasswordReset(email) {
    await init();
    if (!auth || !sdk) throw new Error('Firebase non configuré.');
    try {
      await sdk.sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      throw new Error(translateAuthError(err));
    }
  },

  async signInWithGoogle() {
    await init();
    if (!auth || !sdk) throw new Error('Firebase non configuré.');
    const provider = new sdk.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      if (currentUser && currentUser.isAnonymous) {
        const cred = await sdk.linkWithPopup(currentUser, provider);
        return formatUser(cred.user);
      }
      const cred = await sdk.signInWithPopup(auth, provider);
      return formatUser(cred.user);
    } catch (err) {
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/operation-not-supported-in-this-environment') {
        await sdk.signInWithRedirect(auth, provider);
        return null;
      }
      throw new Error(translateAuthError(err));
    }
  },

  async signInAsGuest() {
    await init();
    if (!auth || !sdk || !navigator.onLine) {
      // Mode invité local pur
      return null;
    }
    try {
      const cred = await sdk.signInAnonymously(auth);
      return formatUser(cred.user);
    } catch (err) {
      // Si l'auth anonyme est désactivée dans la console Firebase, on reste en mode invité local
      console.warn('Auth anonyme indisponible, bascule en invité local:', err?.code || err);
      return null;
    }
  },

  async signOut() {
    await init();
    if (!auth || !sdk) return;
    if (pendingState && currentUser) {
      const toFlush = pendingState;
      pendingState = null;
      if (pushTimer) {
        clearTimeout(pushTimer);
        pushTimer = null;
      }
      await writeToFirestoreNow(toFlush, currentUser);
    }
    await sdk.signOut(auth);
  }
};
