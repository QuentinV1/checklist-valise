# 🧳 Checklist Valise & Bagages (PWA & Standalone)

Application mobile-first & web conçue pour préparer vos bagages en toute sérénité, calculer les poids au gramme près, respecter la réglementation aérienne IATA et optimiser la place pour les souvenirs.

---

## ✨ Fonctionnalités Clés

1. **⚖️ Calculateur de Poids au Gramme Près & Jauges en Direct** :
   - Répartition par bagage : **Valise Soute** (ex: max 23 kg), **Valise Cabine** (ex: max 8 kg), **Sac à dos personnel / Daypack** (ex: max 4 kg) et **Sur soi / Poches**.
   - Jauge colorée dynamique (Cyan / Orange d'avertissement / Rouge si dépassement de la franchise autorisée).
   - Calcul automatique de la **marge restante pour les souvenirs du retour**.

2. **✈️ Respect des Réglementations Aériennes (IATA)** :
   - Badges visuels d'avertissement automatique :
     - ⚠️ **Cabine obligatoire** : Batteries externes (powerbanks), e-cigarettes, passeports, objets de valeur (interdits en soute).
     - ⛔ **Soute obligatoire** : Couteaux suisses, coupe-ongles, ciseaux, flacons de liquides > 100 ml.
   - Rappel de la règle des liquides en cabine (flacons < 100 ml regroupés dans une pochette transparente de 1L).

3. **🌍 Modèles Préconfigurés en 1 Clic** :
   - 🇯🇵 **Grand Voyage / Japon (15-21 jours)** : Adaptateurs type A, QR codes Visit Japan, espèces yens, chaussures pratiques pour les temples, vêtements thermiques, pèse-bagage, etc.
   - ⚡ **Week-end Express (2-4 jours)** : Bagage cabine léger, essentiels de voyage, zéro superflu.
   - 🌲 **Bivouac & Randonnée (3-5 jours)** : Poids ciblé du sac à dos, tente/tarp, réchaud, filtre à eau, micro-doudoune.

4. **📱 100% Hors-Ligne & Installation Facile** :
   - **Mode Standalone (`checklist-valise-standalone.html`)** : un seul fichier autonome, ouvrable immédiatement d'un double-clic dans n'importe quel navigateur sans aucun serveur ni installation.
   - **Mode PWA (`index.html`)** : installable sur l'écran d'accueil iPhone (Safari > Partager > Sur l'écran d'accueil) et Android (Chrome > Installer). Fonctionne en mode avion dans le vol ou le train grâce au Service Worker.
   - **Sauvegarde automatique** dans le `localStorage` du téléphone ou de l'ordinateur.
   - **Export / Import JSON** pour archiver ou partager sa liste avec des proches.
   - **Mode Impression / PDF** avec mise en page épurée automatique.

---

## 🚀 Utilisation Immédiate

- **Directement en local** : Double-cliquez sur `checklist-valise-standalone.html` ou `index.html`.
- **Hébergement gratuit** : Déployable en 1 clic sur Netlify (un fichier `netlify.toml` est déjà inclus) ou Firebase Hosting.
