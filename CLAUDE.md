# Cellar book — Brief Claude Code

> Logiciel personnel de gestion de cave à vin. Cahier des charges initial à déposer comme `CLAUDE.md` à la racine du repo, ou à décomposer en plusieurs documents de spec selon ton workflow Claude Code habituel.

---

## 1. Vision & principes directeurs

**Problème à résoudre.** Gérer intelligemment une cave de ~1000 bouteilles (Bourgogne blanc, grower Champagne, Rhône Nord, Italie, etc.) répartie sur deux lieux (Montreuil et Vézelay). Les solutions du marché (Vivino en particulier) enferment la donnée et sous-exploitent l'intelligence possible.

**Deux objectifs orthogonaux**

- **Souveraineté de la donnée** : base ouverte, exportable, portable, non dépendante d'un éditeur tiers
- **Intelligence d'usage** : pairings, gestion d'apogée, optimisation de cave, anticipation 3-5 ans, via couche LLM

**Quatre cas d'usage prioritaires**

1. Pairings nourriture/vin bidirectionnels (plat→cave et cave→plat)
2. Gestion des bouteilles à apogée ouverte ou à boire dans l'année
3. Optimisation de la cave actuelle : détection des manques par rapport à un profil cible
4. Anticipation prospective : "qu'est-ce qu'il me faudrait acheter pour avoir tel profil dans 3 ans, 5 ans ?"

**Principes non-négociables**

- Offline-first (accès à la cave, parfois sans réseau)
- Pas d'abonnement SaaS, mais coûts API LLM à l'usage acceptés
- Données dans un format ouvert (SQLite) exportables à tout moment
- L'IA est une couche par-dessus la donnée, jamais le cœur. La donnée survit au modèle

---

## 2. Architecture technique

**Stack**

- Frontend : Next.js 15+ (App Router) + Tailwind CSS + shadcn/ui + Framer Motion
- PWA installable avec mode offline (Service Worker, IndexedDB pour cache de lecture)
- Backend : Next.js API routes (Node.js)
- Base : SQLite via better-sqlite3 (1000 bouteilles, largement sous-dimensionné)
- Stockage fichiers : système de fichiers du NAS (photos d'étiquettes)
- IA : API Anthropic (Claude par défaut), couche d'abstraction permettant de switcher de provider

**Déploiement**

- Conteneur Docker sur Synology DS920+ (cohérent avec écosystème existant : Roon Server déjà containerisé)
- Volumes Docker mappés sur le NAS pour la base SQLite et le dossier `labels/`
- Accès externe via reverse proxy Synology + DDNS, ou via Tailscale/Wireguard
- Backups : snapshot du fichier SQLite + dossier `labels/` dans la rotation Hyper Backup existante du NAS

**Auth**

- Single-user, mot de passe perso, sessions persistantes (cookie httpOnly, durée longue)
- Rate limiting sur le endpoint login
- Pas de récupération mot de passe automatique (single-user)

**Souveraineté & portabilité**

- Toutes les données utilisateur dans `cave.sqlite` (un seul fichier)
- Photos d'étiquettes dans `labels/{wine_id}/{timestamp}.jpg`
- Export complet en un clic : ZIP contenant le `.sqlite` + dossier `labels/` + dump JSON lisible pour archive long terme
- Schema versionné avec migrations idempotentes

---

## 3. Modèle de données

### 3.1 Entités principales

**`wines` — référence d'un vin (un domaine/cuvée/millésime/format)**

- `id` (uuid)
- `producer` (domaine / maison)
- `cuvee` (nom de la cuvée)
- `appellation` (ex. "Côte-Rôtie", "Champagne", "Barolo")
- `region` (ex. "Rhône Nord", "Champagne", "Piémont")
- `country`
- `vintage` (année, nullable si non-millésimé type Champagne NV)
- `format` (75cl, magnum, jéroboam, demi, etc.)
- `color` (rouge, blanc, rosé, effervescent, vin doux)
- `grapes` (JSON array des cépages déclarés)
- `apogee_start_year`, `apogee_end_year` (fenêtre apogée)
- `apogee_source` (heuristique, LLM, manuel)
- `notes_general` (description du vin par toi-même, hors dégustation)
- `created_at`, `updated_at`

**`lots` — achats d'un vin (un vin peut avoir plusieurs lots)**

- `id`
- `wine_id` (FK)
- `quantity_initial` (nombre acheté)
- `quantity_remaining` (décrémenté à la consommation)
- `unit_price` (prix unitaire à l'achat)
- `currency` (par défaut EUR)
- `purchase_date`
- `source` (caviste, domaine, enchère, cadeau, libre)
- `cellar_location` ("Montreuil" ou "Vézelay" — extensible)
- `notes`
- `created_at`, `updated_at`

**`consumptions` — événements de consommation**

- `id`
- `lot_id` (FK)
- `date`
- `rating_20` (note /20, nullable)
- `rating_external_100` (score externe Parker etc., nullable)
- `food_paired` (texte libre du plat associé)
- `pairing_success` (réussi / moyen / raté, nullable)
- `context` (qui, occasion — texte libre)
- `tasting_notes` (texte libre)
- `created_at`

**`wishlist_items` — vins envisagés**

- `id`
- `producer`, `cuvee`, `appellation`, `vintage` (peuvent être partiels)
- `target_price` (prix cible)
- `source_seen` (où vu : caviste X, recommandation IA, etc.)
- `reason` (pourquoi : combler manque "rhône nord 2018-2020", recommandation IA, etc.)
- `priority` (haute / moyenne / basse)
- `notes`
- `created_at`

**`target_profile` — profil cible de cave**

- Sous forme de quelques principes structurants déclarés (3-4 max) + champs libres
- Stocké en JSON ou en tableau key/value
- Exemple : `{"min_champagne_pret_a_boire": 12, "annees_avance_bourgogne_blanche": 5, "ratio_rouges_target": 0.5}`
- Évolution attendue avec le temps

**`label_photos` — métadonnées des photos d'étiquettes**

- `id`, `wine_id` (FK), `path` (chemin relatif), `created_at`

### 3.2 Vues calculées (au runtime, pas stockées)

- **Stock total par vin** = somme des `quantity_remaining` des lots
- **Prix moyen pondéré** = moyenne pondérée des prix d'achat des lots
- **Bouteilles à boire dans l'année** = vins dont la fenêtre apogée se ferme dans les 12 mois ET `quantity_remaining > 0`
- **Bouteilles à apogée ouverte** = vins dont `apogee_start_year ≤ année courante ≤ apogee_end_year`
- **Rythme de consommation mesuré** = moyenne mobile sur 12 mois des `consumptions`

---

## 4. Fonctionnalités par cas d'usage

### 4.1 Saisie d'une nouvelle bouteille (workflow scan)

1. L'utilisateur photographie l'étiquette (face + contre-étiquette si nécessaire, idéal 2 photos)
2. Upload (queue offline si pas de réseau)
3. Appel Claude Vision : extraction structurée { producer, cuvee, appellation, vintage, grapes_si_lisibles, format }
4. Recherche fuzzy en base : "ce vin existe déjà ?" Si oui → propose d'incrémenter / créer nouveau lot. Si non → nouvelle fiche
5. Enrichissement Claude : fenêtre apogée proposée + description courte de la cuvée/millésime (à partir des connaissances LLM, sans scraping)
6. Écran de validation : tu confirmes/corriges, tu renseignes prix, source, qté, cave
7. Sauvegarde + photo archivée

**Saisie alternative manuelle** : formulaire direct, pour les vins peu reconnaissables ou les ajouts en batch sans photo.

### 4.2 Import initial CSV (one-shot)

- Endpoint d'import qui mange un CSV au format générique : `producer, cuvee, appellation, vintage, format, quantity, unit_price, purchase_date, cellar_location`
- Pour chaque ligne : création du `wine` (si nouveau) + création d'un `lot`
- Enrichissement Claude différé pour la fenêtre apogée et la description (pas bloquant à l'import)
- Logs détaillés des lignes en erreur

**Note hors brief :** L'extraction depuis Vivino est un sous-projet séparé. Vivino n'a pas d'API publique, et son option d'export historique est instable. Plan d'extraction : script Playwright/Puppeteer dédié à scraper le compte Vivino une fois, produisant le CSV au format ci-dessus. À traiter en post-MVP.

### 4.3 Consommation : marquer une bouteille bue

- Depuis la fiche du vin (ou via recherche rapide) : bouton "j'ouvre cette bouteille"
- 1 tap → `quantity_remaining -= 1` du lot le plus ancien (ou choix du lot si plusieurs)
- Création d'un `consumption` minimal (date = now)
- Toast/notif "complète ta dégustation plus tard ?"
- Écran de complétion différée optionnel : note /20, plat, contexte, tasting notes

### 4.4 Pairings nourriture/vin

**Mode plat → cave** (cas dominant)

- Saisie structurée du plat :
  - Protéine principale (boeuf, agneau, volaille, poisson gras, poisson maigre, légume principal, fromage…)
  - Cuisson (cru, mijoté, rôti, grillé, vapeur…)
  - Sauce (acide, sucrée, crémeuse, épicée, jus, aucune…)
  - Intensité aromatique (légère, moyenne, puissante)
  - Accompagnements clés (champignons, fruits, herbes…)
- Filtres appliqués :
  - Apogée ouverte aujourd'hui
  - Quantité disponible > 0
  - Cave de présence (Montreuil/Vézelay, choix manuel ou auto)
  - Boost "fin de fenêtre apogée" (à boire en priorité)
  - Anti-doublon : pénaliser les vins consommés récemment avec un plat similaire
- Sortie : top 3-5 propositions avec justification détaillée (3-4 lignes œnologiques) + alternative typologique

**Mode cave → plat**

- Tu choisis un vin de ta cave
- Claude propose 2-3 directions de plats avec niveau de raffinement (technique de cuisson, sauce, accompagnements)

### 4.5 Optimisation de cave actuelle

- Définition d'un profil cible (3-4 principes déclarés + analyse inductive de l'historique)
- Tableau de bord "manques" : pour chaque axe (région, couleur, fenêtre temporelle, occasion), écart cible vs réel
- Suggestions d'achat priorisées, alimentent la wishlist enrichie

### 4.6 Anticipation prospective 3-5 ans

- Simulation de l'état de la cave à un horizon donné
- Calculs :
  - Bouteilles encore présentes en T+N = stock actuel - (rythme conso × N)
  - Bouteilles à apogée ouverte en T+N = celles dont `apogee_start_year ≤ T+N ≤ apogee_end_year`
- Détection de trous prospectifs par région/couleur/style
- Recommandations d'achat : "il manque ~12 bouteilles de Rhône Nord à apogée 2029-2031 — millésimes 2020-2022 à acheter aujourd'hui"
- Visualisation : graphique stack par horizon temporel

### 4.7 Wishlist enrichie

- Liste avec sources multiples :
  - Saisie manuelle (vu chez un caviste, recommandation perso)
  - Suggestions IA (issues du module d'optimisation et d'anticipation)
  - Suggestions pour pairings futurs prévus
- Tri par priorité et par estimation de date d'achat optimale

### 4.8 Recherche & exploration

- Recherche full-text sur producer, cuvee, appellation, region, tasting notes
- Filtres combinables : couleur, région, millésime, cave, fenêtre apogée, prix, note moyenne
- Vue "ma cave en chiffres" : répartition par couleur / région / millésime / fenêtre apogée / cave physique

---

## 5. Couche IA

**Modèle par défaut**

- Claude Sonnet 4.6 pour la vision et le raisonnement texte (rapport qualité/prix optimal)
- Claude Opus 4.7 en option pour les requêtes complexes (anticipation, optimisation profonde)

**Abstraction**

- Couche `lib/llm/` avec un client unifié
- Switch possible vers GPT-4o, Gemini, etc. via env vars
- Logs des appels (tokens in/out, latence, coût estimé) pour observabilité

**Caching**

- Mise en cache locale des enrichissements de vin (apogée, description) — pas besoin de re-payer Claude pour le même vin
- Photos d'étiquettes traitées une seule fois, résultat persisté dans la fiche vin

**Estimation des coûts**

- Seeding initial ~1000 bouteilles : 10-30€ one-shot (vision + enrichissement)
- Usage courant : <5€/mois (quelques scans, quelques pairings, quelques analyses)
- À comparer avec un abonnement Vivino Premium ou équivalent : équivalent ou inférieur

**Prompts à concevoir avec soin** (à itérer dans `prompts/`)

- `vision_label_extraction.md` — extraction structurée depuis photo
- `apogee_estimation.md` — proposition fenêtre apogée avec justification
- `wine_description.md` — description courte du vin (cépage, terroir, style)
- `pairing_plat_to_cave.md` — propositions de vins pour un plat structuré
- `pairing_cave_to_plat.md` — propositions de plats pour un vin donné
- `cellar_gap_analysis.md` — détection des manques vs profil cible
- `prospective_simulation.md` — simulation à T+N avec recommandations

---

## 6. UX/UI — principes directeurs

- Mobile-first (consultation à la cave) mais excellent sur desktop (saisie batch, analyse)
- 3 vues racine : Cave (catalogue), Boire (ce que je sors), Optimiser (analyse, anticipation)
- Cherche-le-vin global accessible en 1 tap, fuzzy, ultra-rapide
- Tu peux décrémenter une bouteille en moins de 3 taps depuis n'importe où
- Densité d'information élevée, pas de fioritures, esprit "tableau de bord" plus que "app grand public"
- Photos d'étiquettes affichées partout où elles aident à l'identification visuelle

---

## 7. Plan d'implémentation en 4 phases

**Phase 0 — Fondations (1-2 sessions Claude Code)**

- Bootstrap projet Next.js + Tailwind + shadcn/ui
- Setup Docker + Dockerfile + docker-compose.yml pour Synology
- Schema SQLite v1 + migrations + better-sqlite3
- Auth simple (mot de passe + session)
- CI minimal (lint + typecheck)

**Phase 1 — MVP utilisable (3-5 sessions)**

- CRUD complet wines / lots / consumptions
- Import CSV
- Recherche full-text + filtres
- Vue cave + vue fiche vin
- Décrément 1-tap d'une bouteille
- Dump/restore SQLite + dossier labels

**Phase 2 — Couche IA (3-5 sessions)**

- Intégration Claude API avec abstraction provider
- Scan photo étiquette → extraction → validation
- Enrichissement apogée + description
- Pairings plat→cave (puis cave→plat)
- Caching des enrichissements

**Phase 3 — Intelligence prospective (3-5 sessions)**

- Profil cible (déclaratif + inductif)
- Optimisation cave actuelle (analyse des manques)
- Simulation prospective à T+N
- Wishlist enrichie
- Tableau de bord chiffres clés

**Phase 4 — Polish & nice-to-have**

- PWA installable + Service Worker offline complet
- Queue offline des photos à traiter
- Mode "dégustation" guidé (saisie multi-vins, soirée comparative)
- Export ZIP complet (sqlite + labels + dump JSON)
- Sous-projet de scraping Vivino dédié si besoin de seeding

---

## 8. Hors-scope explicite (MVP)

- Emplacement physique fin (casier/rangée/position) — la cave a des zones nommées, on ne descend pas plus bas
- Valorisation marché temps réel (intégration Wine-Searcher etc.) — phase ultérieure
- Multi-utilisateur — single-user uniquement
- Mode social / partage public
- Marketplace / achat intégré
- Notifications push complexes

---

## 9. Conventions de code

- TypeScript strict
- ESLint + Prettier en pre-commit
- Tests : Vitest pour la logique métier (calcul d'apogée, simulations), Playwright pour les flows critiques
- Pas d'over-engineering : on est en single-user sur 1000 lignes en SQLite, pas un SaaS B2B
- Tous les composants UI passent par shadcn/ui ou Tailwind direct, pas de framework CSS additionnel
- Variables d'environnement pour : `ANTHROPIC_API_KEY`, `DB_PATH`, `LABELS_DIR`, `SESSION_SECRET`, `APP_PASSWORD_HASH`

---

## 10. Questions ouvertes à trancher en cours de route

- Choix exact du modèle Claude par appel (Sonnet partout vs Opus sur les analyses prospectives)
- Stratégie de fallback si réseau down pour les enrichissements LLM (queue + retry vs dégradation gracieuse)
- Modèle d'identification multi-format pour un même vin (un Bérêche Réserve 2018 75cl et un magnum sont-ils un seul vin avec plusieurs formats, ou deux wines distincts ? Recommandation : un seul `wine` par millésime, `format` est un attribut du lot ; à valider)
- Nom de domaine si exposition publique envisagée (sinon accès via IP/Tailscale suffit)

---

_Ce brief est volontairement exhaustif sur la structure et léger sur le code. À Claude Code de concrétiser dans le repo, avec validation à chaque phase._
