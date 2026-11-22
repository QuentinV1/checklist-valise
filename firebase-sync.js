// Intégration Firebase Auth & Cloud Firestore (quentin-apps-hub) — alignée sur L'Affinoir (app-charcuterie)
// - valise_users/{uid}/trips/{docId} : voyages & checklists de l'utilisateur
// - valise_users/{uid}/templates/{docId} : modèles personnalisés de l'utilisateur
// - valise_users/{uid}/settings/main : préférences d'affichage & voyage actif

import {
  resolveUserAccess,
  resolveGateAccess,
  clearCachedAuthAccess,
  getCachedAuthAccess,
  renderAccessControlPanel
} from './access-control.js';

export const FIREBASE_CONFIG = window.VALISE_FIREBASE_CONFIG || {
  projectId: 'quentin-apps-hub',
  appId: '1:249016348389:web:72db83034ab9737b9cee0c',
  storageBucket: 'quentin-apps-hub.firebasestorage.app',
  apiKey: 'AIzaSyCuYM0tMpd1f1jDYz27OhCaPpcAWhI3i48',
  authDomain: 'quentin-apps-hub.firebaseapp.com',
  messagingSenderId: '249016348389'
};

let fb = null; // { app, auth, db, authMod, fsMod }
let currentUser = null;
let unsubListeners = [];

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
      return 'Domaine non autorisé dans Firebase Console.';
    default:
      return error?.message || 'Erreur d’authentification.';
  }
}

export function getFirebaseUser() {
  return currentUser;
}

export function estConnecteFirebase() {
  return !!currentUser;
}

export async function initFirebase() {
  if (fb) return fb;
  if (window.location.protocol === 'file:') {
    return null;
  }
  try {
    const [appMod, authMod, fsMod] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js')
    ]);

    const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(FIREBASE_CONFIG);
    const auth = authMod.getAuth(app);
    const db = fsMod.initializeFirestore(app, {
      localCache: fsMod.persistentLocalCache({
        tabManager: fsMod.persistentMultipleTabManager()
      }),
      ignoreUndefinedProperties: true
    });

    fb = {
      app,
      auth,
      db,
      authMod,
      fsMod
    };
    return fb;
  } catch (err) {
    console.warn('Firebase SDK indisponible (mode hors-ligne local):', err);
    return null;
  }
}

export function observerAuth(onUserChanged) {
  initFirebase().then((instance) => {
    if (!instance) {
      onUserChanged(null);
      return;
    }
    instance.authMod.onAuthStateChanged(instance.auth, (user) => {
      currentUser = user || null;
      onUserChanged(currentUser);
    });
  });
}

export async function connexionEmail(email, password) {
  const instance = await initFirebase();
  if (!instance) throw new Error('Firebase indisponible hors-ligne.');
  try {
    const cred = await instance.authMod.signInWithEmailAndPassword(instance.auth, email.trim(), password);
    return cred.user;
  } catch (err) {
    throw new Error(translateAuthError(err));
  }
}

export async function inscriptionEmail(email, password) {
  const instance = await initFirebase();
  if (!instance) throw new Error('Firebase indisponible hors-ligne.');
  try {
    const cred = await instance.authMod.createUserWithEmailAndPassword(instance.auth, email.trim(), password);
    if (cred.user && instance.authMod.sendEmailVerification) {
      instance.authMod.sendEmailVerification(cred.user).catch(() => {});
    }
    return cred.user;
  } catch (err) {
    throw new Error(translateAuthError(err));
  }
}

export async function renvoyerEmailVerification() {
  const instance = await initFirebase();
  if (!instance || !instance.auth.currentUser) throw new Error('Aucun utilisateur connecté.');
  if (instance.auth.currentUser.emailVerified) return false;
  await instance.authMod.sendEmailVerification(instance.auth.currentUser);
  return true;
}

export async function rechargerUtilisateurFirebase() {
  const instance = await initFirebase();
  if (!instance || !instance.auth.currentUser) return null;
  await instance.auth.currentUser.reload();
  currentUser = instance.auth.currentUser;
  return currentUser;
}

export async function connexionGoogle() {
  const instance = await initFirebase();
  if (!instance) throw new Error('Firebase indisponible hors-ligne.');
  try {
    const provider = new instance.authMod.GoogleAuthProvider();
    const cred = await instance.authMod.signInWithPopup(instance.auth, provider);
    return cred.user;
  } catch (err) {
    throw new Error(translateAuthError(err));
  }
}

export async function deconnexionFirebase() {
  arreterListenersFirestore();
  if (!fb) return;
  await fb.authMod.signOut(fb.auth);
  currentUser = null;
}

export function arreterListenersFirestore() {
  unsubListeners.forEach(unsub => {
    try { unsub(); } catch {}
  });
  unsubListeners = [];
}

function cleanForFirestore(obj) {
  return JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
}

// Écoute temps réel des collections privées de l'utilisateur + settings/main
export function demarrerSyncFirestore({
  onCollectionUpdate,
  onSettingsUpdate,
  onSyncError
}) {
  arreterListenersFirestore();
  if (!fb || !currentUser) return;

  const { collection, doc, onSnapshot } = fb.fsMod;
  const uid = currentUser.uid;
  const handleErr = (label, err) => {
    console.warn(`Sync ${label}:`, err);
    if (typeof onSyncError === 'function') onSyncError(err, label);
  };

  const userCollections = ['trips', 'templates'];
  userCollections.forEach(colName => {
    unsubListeners.push(
      onSnapshot(collection(fb.db, 'valise_users', uid, colName), (snap) => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        onCollectionUpdate(colName, list, snap.metadata.fromCache);
      }, (err) => handleErr(colName, err))
    );
  });

  unsubListeners.push(
    onSnapshot(doc(fb.db, 'valise_users', uid, 'settings', 'main'), (snap) => {
      if (snap.exists()) {
        onSettingsUpdate(snap.data());
      }
    }, (err) => handleErr('settings', err))
  );
}

// Découpage en lots <= 450 opérations par writeBatch
async function commitBatchChunked(db, writeBatchFn, operations) {
  const CHUNK_SIZE = 450;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatchFn(db);
    chunk.forEach(op => {
      if (op.type === 'delete') {
        batch.delete(op.ref);
      } else if (op.type === 'set') {
        batch.set(op.ref, op.data);
      }
    });
    await batch.commit();
  }
}

export async function syncAllUserDataToFirestore(appState) {
  if (!fb || !currentUser) return;
  const { collection, doc, writeBatch, getDocs } = fb.fsMod;
  const uid = currentUser.uid;
  const nowIso = new Date().toISOString();

  const mapping = [
    ['trips', appState.trips || []],
    ['templates', appState.customTemplates || []]
  ];

  for (const [colName, items] of mapping) {
    const colRef = collection(fb.db, 'valise_users', uid, colName);
    const existingSnap = await getDocs(colRef);
    const currentIds = new Set(items.filter(i => i && i.id).map(i => String(i.id)));

    const ops = [];
    existingSnap.docs.forEach(d => {
      if (!currentIds.has(d.id)) {
        ops.push({ type: 'delete', ref: d.ref });
      }
    });

    items.forEach(item => {
      if (item && item.id) {
        const docId = String(item.id);
        const normalized = {
          ...item,
          id: docId,
          createdAt: item.createdAt || nowIso,
          updatedAt: nowIso
        };
        ops.push({
          type: 'set',
          ref: doc(colRef, docId),
          data: cleanForFirestore(normalized)
        });
      }
    });

    if (ops.length > 0) {
      await commitBatchChunked(fb.db, writeBatch, ops);
    }
  }

  await setDocSettingsFirestore(appState);
}

export async function setDocSettingsFirestore(appState) {
  if (!fb || !currentUser) return;
  const { doc, setDoc } = fb.fsMod;
  const nowIso = new Date().toISOString();
  await setDoc(doc(fb.db, 'valise_users', currentUser.uid, 'settings', 'main'), cleanForFirestore({
    id: 'main',
    activeTripId: appState.activeTripId || null,
    viewMode: appState.viewMode || 'chrono',
    filterPhase: appState.filterPhase || 'all',
    filterBaggage: appState.filterBaggage || 'all',
    filterStatus: appState.filterStatus || 'all',
    collapsedSections: (appState.collapsedSections && typeof appState.collapsedSections === 'object')
      ? appState.collapsedSections
      : {},
    updatedAt: nowIso
  }));
}

// Exposer l'API sur window.ValiseFirebase pour app.js (compatible build standalone)
window.ValiseFirebase = {
  FIREBASE_CONFIG,
  getFirebaseUser,
  estConnecteFirebase,
  initFirebase,
  observerAuth,
  connexionEmail,
  inscriptionEmail,
  renvoyerEmailVerification,
  rechargerUtilisateurFirebase,
  connexionGoogle,
  deconnexionFirebase,
  arreterListenersFirestore,
  demarrerSyncFirestore,
  syncAllUserDataToFirestore,
  setDocSettingsFirestore,
  resolveUserAccess,
  resolveGateAccess,
  clearCachedAuthAccess,
  getCachedAuthAccess,
  renderAccessControlPanel
};
