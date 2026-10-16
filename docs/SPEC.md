# SblaaafShoot — Cahier des charges

> Document de référence pour Claude Code. À placer dans `docs/SPEC.md`.
> Version 1.0 — 16/10/2026.

---

## 1. Vision

Jeu mobile **lane defense / gate shooter** en mode portrait, joué à une main.
Une escouade de tireurs, en bas de l'écran, glisse de gauche à droite. Elle tire
automatiquement vers le haut sur une horde qui descend. Le joueur choisit sa
trajectoire pour :

- franchir les **portes bonus** (bleues) et éviter les **portes malus** (corail) ;
- détruire des **caisses** qui donnent des améliorations de tir ;
- **tirer sur les portes** pour en améliorer la valeur ;
- tout en gardant l'axe de tir sur les ennemis.

Le cœur du plaisir est **l'arbitrage permanent** : tuer maintenant ou investir dans
un bonus qui sauvera la partie plus tard. Exemple : avec 5 tireurs, `+10` vaut
mieux que `×2` (15 contre 10). Avec 20 tireurs, c'est l'inverse (30 contre 40).

Le jeu est **personnel, 100 % hors-ligne**, sans compte, sans pub et sans réseau
à l'exécution.

## 2. Contraintes et budgets (critères d'acceptation globaux)

| Contrainte | Cible |
|---|---|
| Appareil de référence | Samsung Galaxy S23 FE, Android, Chrome, écran 120 Hz |
| Orientation | Portrait verrouillé |
| Taille APK | < 50 Mo obligatoire, viser < 15 Mo |
| Bundle web (gzip) | Viser < 2 Mo, hors service worker |
| Images / fichiers audio | **Aucun** en V1 : tout est généré par le code |
| RAM | Viser < 150 Mo pendant le jeu (vérifier via Chrome DevTools distant) |
| Framerate | 60 FPS stables au pire moment du niveau 50 |
| Logique | Pas fixe 60 Hz, déterministe (voir §5.1) |
| Rendu | Plafonné à 60 FPS par défaut ; option « Fluidité 120 Hz » |
| Réseau | Aucun appel réseau à l'exécution ; jouable en mode avion après installation |
| Accessibilité | WCAG 2.2 AA dans la mesure applicable à un jeu (voir §8.4) |

## 3. Stack technique

**Vérifie la dernière version stable de chaque outil au jalon 0** et rapporte-la.
Ne suppose pas de version.

- **Node.js** : LTS active (24 au moment de l'écriture, à vérifier), via Docker.
- **TypeScript 5.x**, mode strict.
- **Phaser 3.x**, dernière version stable. Vérifie si Phaser 4 est sorti en stable :
  si oui, présente le pour et le contre avant de choisir et attends ma décision.
- **Vite**, dernière version stable.
- **vite-plugin-pwa** (Workbox) pour le manifest et le service worker.
- **idb-keyval**, ou équivalent minimal, pour IndexedDB.
- **Vitest** pour les tests unitaires, **Playwright** pour les tests de bout en bout.
- **Capacitor** (dernière version stable) pour l'APK Android.
- Pas d'autre dépendance runtime sans justification et sans mon accord.

## 4. Gameplay

### 4.1 Terrain

- Un couloir vertical. L'escouade est fixée sur sa ligne, à environ 85 % de la
  hauteur de l'écran. La base est sous l'escouade.
- Résolution logique de conception : 360 px de large. La hauteur s'adapte au ratio
  de l'écran (S23 FE ≈ 19,5:9) sans déformation. Vérifie le mode de scaling Phaser
  approprié, par exemple `EXPAND` s'il est disponible.
- Respecte les zones sûres (`env(safe-area-inset-*)`) : encoche, barre de gestes.
- Fausse perspective légère : ombres portées et léger rétrécissement des objets
  lointains. **Pas d'isométrie** : la lisibilité du couloir prime.

### 4.2 Contrôles

- **Glissement relatif** : le doigt se pose n'importe où, et l'escouade suit le
  déplacement horizontal du doigt (delta), pas sa position absolue. Le doigt ne
  cache donc jamais l'action.
- Sensibilité réglable (0,5× à 2×). Pas de zone morte.
- L'escouade est bornée aux murs du couloir. Mouvement lissé, sans inertie excessive.
- Tir **automatique** et continu. Aucun bouton de tir.

### 4.3 Escouade et tir

- Départ : **1 tireur**. Pas de méta-progression : chaque partie repart de zéro.
- Formation en grappe compacte, centrée sur la position de contrôle.
- **Plafond visuel : 40 bonshommes affichés.** Au-delà, un badge « ×87 » s'affiche
  au-dessus de la grappe. La puissance réelle continue d'augmenter.
- **Agrégation des balles (performance)** : ne pas créer une balle par tireur quand
  l'effectif est grand. Chaque balle affichée porte un multiplicateur de dégâts.
  Le DPS total doit rester exactement identique à celui d'un tir « une balle par
  tireur ». Plafond : environ 300 balles actives (pool).
- Valeurs de départ suggérées, à ajuster par le simulateur : 1 tir/s/tireur
  multiplié par une cadence de base, 1 dégât par balle, portée sur tout l'écran.

### 4.4 Portes

Les portes descendent avec le flux. Elles sont isolées ou **par paires côte à côte**.
Le passage se fait au contact de la grappe : c'est le centre de l'escouade qui
compte, pour éviter toute ambiguïté.

| Type | Effet | Couleur |
|---|---|---|
| `+N` / `−N` | Ajoute ou retire N tireurs (minimum 1… sauf règle Contact, voir §4.7) | Bleu / corail |
| `×N` / `÷N` | Multiplie ou divise l'effectif (arrondi inférieur, minimum 1) | Bleu / corail |
| `Puissance +X %` / `−X %` | Modifie les dégâts par balle | Bleu / corail |
| `Cadence +X %` / `−X %` | Modifie la cadence de tir | Bleu / corail |
| `Ennemis +N` | Malus : fait apparaître N ennemis en plus dans la vague suivante | Corail |
| `Ennemis PV +X %` | Malus : renforce les ennemis pendant T secondes | Corail |

**Portes modifiables au tir** : chaque porte a des « PV de palier ». Chaque fois que
les balles atteignent ce seuil, la valeur monte d'un cran :
- additif : `−10 → −9 → … → 0 → +1 → …`, jusqu'à un plafond défini par le niveau ;
- multiplicatif : `÷3 → ÷2 → ×1 → ×2 → ×3`, jusqu'à un plafond ;
- quand la valeur devient positive, la porte passe visuellement du corail au bleu.

**Lisibilité (obligatoire, WCAG 1.4.1)** : l'information ne doit jamais reposer
sur la seule couleur.
- Signe et valeur toujours affichés en gros (`+5`, `×2`, `−5`, `÷2`) : texte blanc
  gras avec contour foncé.
- Formes distinctes : arche arrondie pour un bonus, cadre à pointes pour un malus.
- Jauge de progression visible sur une porte en cours de modification.

**Paires stratégiques** : le générateur (§6) place volontairement des paires proches
du **point de bascule**. Exemple : `+N` contre `×M` avec un effectif attendu proche
de `N / (M − 1)`. Le bon choix doit alors dépendre de l'état du joueur.

### 4.5 Caisses

- Blocs avec des PV affichés dessus. Les détruire donne une récompense immédiate.
- Récompenses V1 : **Multi-tir** (+1 balle en éventail), **Perforant** (la balle
  traverse 1 ennemi de plus), **Cadence +25 %**, **Renfort** (+N tireurs).
- Une icône sur la caisse indique la récompense (pas seulement une couleur).

### 4.6 Ennemis

Tous les types sont définis **en données** (JSON/TS), pas en classes séparées.

| Type | PV | Vitesse | Poids Contact | Arrive au palier |
|---|---|---|---|---|
| Basique | 1× | 1× | 1 | 1 |
| Rapide | 0,5× | 1,8× | 1 | 2 |
| Tank | 6× | 0,5× | 3 | 3 |
| Mini-boss | 40× | 0,4× | 10 | 1 (niveau 10) |
| Boss | 150× | 0,35× | 25 | 2 et suivants |
| Super-boss | 500× | 0,3× | Tout | 5 (niveau 50) et survie |

Les boss ont une barre de PV dédiée en haut de l'écran. Le design de leurs attaques
spéciales est **hors V1** : ils sont simplement de très gros sacs à PV.

### 4.7 Règles de défaite (mutateurs de niveau)

Chaque niveau déclare une combinaison de règles, par exemple
`rules: ["base"]` ou `rules: ["base", "contact"]`.

| Règle | Effet |
|---|---|
| `base` | La base a des PV. Un ennemi qui passe la ligne inflige ses PV restants (ou son poids) en dégâts. Défaite si les PV tombent à 0 |
| `contact` | Un ennemi qui touche la grappe tue autant de tireurs que son poids, puis meurt. Défaite si l'effectif tombe à 0 |
| `redline` | Le moindre ennemi qui passe la ligne provoque la défaite |

Sans `contact`, les ennemis traversent la grappe sans l'affecter.

Lors de la **première apparition** d'une règle en jeu, afficher une carte de rappel
courte (une seule fois, mémorisée dans la sauvegarde).

### 4.8 Mode Campagne

- **50 niveaux, 5 paliers de 10.** Tous les niveaux d'un palier ouvert sont jouables
  dans n'importe quel ordre. Réussir les 10 niveaux débloque le palier suivant.
  Le palier 1 est ouvert dès le départ.

| Palier | Nom | Nouveautés | Niveau 10 du palier |
|---|---|---|---|
| 1 | Recrue | Règle `base`, portes `+/−/×/÷` simples, ennemis basiques | Mini-boss |
| 2 | Soldat | Caisses, portes modifiables au tir, ennemis rapides | Boss |
| 3 | Sergent | Règle `contact`, tanks, portes puissance/cadence | Boss |
| 4 | Commando | Niveaux `redline` (environ 1 sur 3), portes `Ennemis +N / PV +X %` | Boss |
| 5 | Légende | Tout combiné, densité maximale | Super-boss |

- **Durée** : environ 1 min 30 au niveau 1, en croissance progressive jusqu'à
  4 à 5 minutes au niveau 50. Minimum 2 minutes à partir du palier 2.
- Victoire : le flux du niveau est épuisé et tous les ennemis sont morts (boss compris).
- **Étoiles (1 à 3)** :
  - niveaux `base` : 1★ victoire, 2★ PV de la base ≥ 50 %, 3★ base jamais touchée ;
  - niveaux sans `base` : 1★ victoire, 2★ effectif final ≥ un objectif du niveau,
    3★ objectif atteint sans avoir franchi aucune porte malus.
  - On conserve le meilleur résultat par niveau. Afficher le total (« 112 / 150 ★ »).

### 4.9 Mode Survie (sans fin)

- Flux continu et procédural, seed aléatoire.
- La densité et les PV des ennemis augmentent avec le temps (courbe définie dans la config).
- **Boss de plus en plus fréquents** : premier boss à 90 s, puis l'intervalle
  diminue de 5 s à chaque boss, jusqu'à un minimum de 45 s. Un super-boss tous les 5 boss.
- La proportion bonus/malus des portes glisse de 70/30 à 30/70 sur environ 10 minutes,
  puis reste stable.
- Score = somme des PV ennemis détruits + bonus de temps survécu.
  Record personnel local.
- Règles : `base` + `contact`.

### 4.10 Tutoriel : « Camp d'entraînement »

- Niveau scénarisé dédié, proposé au premier lancement et rejouable depuis le menu.
- Les étapes s'enchaînent **uniquement quand l'action est réalisée** :
  1. glisser pour bouger ;
  2. tirer automatiquement sur des ennemis basiques ;
  3. prendre une porte bleue ;
  4. éviter une porte corail ;
  5. choisir entre deux bonus (exemple `+10` contre `×2` avec 5 tireurs, explication du point de bascule) ;
  6. casser une caisse ;
  7. retourner une porte corail en tirant dessus ;
  8. découvrir les règles Base, Contact et Ligne rouge (cartes courtes) ;
  9. affronter un mini-boss.
- Bouton « Passer le tutoriel » toujours visible.

## 5. Moteur et équilibrage

### 5.1 Simulation déterministe

- Toute la logique de jeu vit dans `src/core/` en **TypeScript pur, sans Phaser ni DOM**.
- Boucle à **pas fixe de 1/60 s** avec accumulateur : on peut faire plusieurs
  updates par frame si nécessaire, et l'interpolation de rendu est optionnelle.
- Générateur aléatoire **avec seed** (par exemple mulberry32). Une seed et une suite
  d'entrées donnent toujours exactement le même résultat.
- Phaser se contente de **lire** l'état du core pour l'afficher et de lui transmettre
  les entrées.

Pourquoi : le même core alimente le jeu, les tests et le simulateur d'équilibrage.
Ce qui est validé en simulation est exactement ce que le joueur vivra.

### 5.2 Format d'un niveau (données)

Chaque niveau est un objet de config validé par un schéma typé : id, palier, règles,
durée cible, PV de la base, courbe de densité, mix d'ennemis, liste ou paramètres de
génération des portes et caisses, boss éventuel, objectifs d'étoiles, seed.

Les niveaux sont **semi-procéduraux** : paramètres écrits par palier et interpolés
entre le niveau 1 et le niveau 50, puis générés avec une seed fixe par niveau.
Ainsi, le niveau 23 est toujours le même.

### 5.3 Simulateur headless

Commande : `docker compose run --rm app npm run sim`. Il joue chaque niveau avec
deux bots, sur N seeds de variation d'entrée (N = 50 par défaut).

- **Bot expert** : anticipe sur quelques secondes, évalue chaque porte ou paire de
  portes selon son effectif courant (calcul du point de bascule), décide de tirer ou
  non sur une porte selon le coût et le gain, et garde l'axe sur la plus forte densité
  d'ennemis. Ce n'est pas un optimum mathématique : signale ses limites.
- **Bot moyen** : même logique, avec un délai de réaction (environ 250 ms), du bruit
  de positionnement et 25 % de choix sous-optimaux sur les paires.

**Critères d'acceptation (la CI échoue s'ils ne sont pas respectés)** :
- le bot expert gagne **100 %** des niveaux de campagne ;
- le taux de victoire du bot moyen décroît globalement : environ 95 % au niveau 1,
  environ 20 % au niveau 50. Une tolérance de ±10 points est acceptée, et chaque palier
  peut connaître un léger creux, voulu, sur son niveau boss ;
- les durées réelles respectent les cibles de §4.8 à ±15 %.

Sortie : un rapport `reports/balance.csv` et un résumé lisible en console
(un tableau par niveau : victoire expert/moyen, durée, effectif max, PV restants).

### 5.4 Le ratio de difficulté (modèle mental)

Difficulté ≈ flux de PV ennemis par seconde divisé par le DPS atteignable par le
bot expert à cet instant. C'est un indicateur de conception, à afficher dans le
rapport, et non une règle absolue.

## 6. Génération des portes et caisses

- Elle dépend de l'effectif **attendu** du joueur à ce moment-là, estimé par le bot
  expert lors d'un premier passage de génération.
- Mélange de portes isolées et de paires : paires bonus/malus, et paires bonus/bonus
  proches du point de bascule.
- Les paliers ajoutent progressivement les types de portes (§4.8).
- Garde-fou : jamais deux paires malus/malus d'affilée sans échappatoire.

## 7. Rendu et direction artistique

### 7.1 Principe

**Tout est généré par le code au démarrage, puis mis en cache sous forme de textures.**
On dessine une fois les poses d'animation, puis on affiche ces images toutes prêtes
(le principe du flipbook). On ne redessine **jamais** des formes vectorielles à
chaque frame pour des entités nombreuses.

- Atlas généré à l'écran de chargement (≤ 2048 × 2048).
- Architecture « skin » : un module `src/render/skins/default/` produit les textures.
  Un futur skin pixel art ou des sprites dessinés à la main pourront le remplacer sans
  toucher au core.

### 7.2 Personnages

- **Bonshommes bâton cartoon, d'aspect 3D** : membres épais aux bouts arrondis, tête
  ronde, petit fusil, ombre portée elliptique au sol, léger ombrage sur un côté.
- Gentils en **blanc cassé** avec un contour foncé. Méchants en **anthracite** avec un
  liseré clair.
- Animations procédurales, cuites en 6 à 8 frames :
  marche (balancement bras/jambes), inclinaison latérale pendant le déplacement,
  recul à chaque tir, mort (chute + fondu).
- Univers : militaire cartoon, très simple. Les boss sont des bonshommes plus gros,
  avec un casque ou un signe distinctif.

### 7.3 Palette (couleurs douces)

| Élément | Couleur |
|---|---|
| Fond / couloir | `#7E8C7A` (sauge) |
| Bords du terrain | `#D8CBB0` (sable) |
| Gentils | `#F4F1EA` + contour `#2B2D33` |
| Méchants | `#2B2D33` + liseré `#F4F1EA` |
| Portes bonus | `#5B8FD9` (bleu doux) |
| Portes malus | `#E07A5F` (corail) |
| Caisses | `#C9A66B` (bois clair) |
| Texte UI | Vérifier un contraste ≥ 4,5:1 sur son fond |

Les contrastes calculés : environ 3,5:1 entre le blanc et le fond, environ 3,9:1
entre l'anthracite et le fond. Les deux sont au-dessus du seuil de 3:1 pour les
éléments graphiques. Revérifie toute nouvelle couleur.

Une palette alternative pour daltoniens n'est pas nécessaire tant que les signes et
les formes sont respectés (§4.4).

### 7.4 Juice (activé par défaut, désactivable)

- Léger tremblement d'écran à l'impact d'un boss et quand la base est touchée.
- Chiffres de dégâts flottants (agrégés, pas un par balle).
- Particules à la mort des ennemis et à l'ouverture des caisses (pool ≤ 200).
- Flash blanc bref quand un ennemi est touché, « pop » quand une porte est franchie,
  zoom léger sur l'effectif quand il change.
- Réglage « Effets » : Complet / Réduit / Aucun. Par défaut : Réduit si
  `prefers-reduced-motion` est actif, sinon Complet.

### 7.5 Performance

- Pooling de tous les objets nombreux : ennemis, balles, particules, textes flottants.
- Détection des collisions par grille spatiale, sans moteur physique.
- Plafonds : environ 250 ennemis à l'écran (au-delà, les vagues sont étalées dans le
  temps par le générateur), environ 300 balles, environ 200 particules.
- Rendu limité à 60 FPS par défaut (option 120 Hz). Pause automatique sur
  `visibilitychange`.
- Compteur FPS et mémoire caché, activable par un appui long sur la version dans les réglages.

## 8. UI / UX

### 8.1 Écrans

1. **Accueil** : Jouer, Survie, Tutoriel, Statistiques, Réglages.
2. **Carte des paliers** : 5 paliers. Les paliers verrouillés montrent un cadenas
   et la condition d'ouverture. Chaque niveau affiche ses étoiles.
3. **Jeu (HUD)** : effectif, dégâts et cadence courants (discrets), PV de la base,
   timer (campagne) ou score (survie), bouton pause. HUD en haut uniquement : le bas
   de l'écran est réservé au pouce.
4. **Pause** : Reprendre, Recommencer, Réglages, Quitter.
5. **Fin de partie** : victoire ou défaite, étoiles animées, statistiques de la partie,
   Rejouer, Suivant, Carte.
6. **Statistiques** : record de survie (temps et score), étoiles par niveau et total,
   nombre total de parties et d'ennemis tués, meilleur effectif atteint, et un graphique
   d'évolution des scores de survie (dessiné en Canvas, sans librairie).
7. **Réglages** : musique, bruitages, vibrations, effets, Fluidité 120 Hz, sensibilité,
   langue, exporter / importer / réinitialiser la sauvegarde (avec confirmation).

### 8.2 Formats

- Dates au format `JJ/MM/AAAA` et heures `HH:mm`, fuseau Europe/Paris, via `Intl`.
- Nombres au format français (`1 234`).

### 8.3 Langues

- Tous les textes passent par `src/i18n/` (`fr.json` complet). Pas de chaîne en dur.
- `en.json` et le sélecteur de langue : **priorité basse**, dernier jalon.

### 8.4 Accessibilité

- Cibles tactiles ≥ 48 × 48 dp dans les menus.
- Contraste du texte ≥ 4,5:1, et ≥ 3:1 pour les éléments graphiques.
- Jamais d'information portée par la seule couleur (signes, formes, icônes).
- Vibrations, flashs et tremblements désactivables. Aucun flash > 3 fois/s
  (WCAG 2.3.1).
- Tailles de texte lisibles en jeu (≥ 14 px logiques pour les valeurs des portes,
  idéalement plus).

## 9. Architecture

```text
sblaaafshoot/
├── CLAUDE.md
├── docs/SPEC.md
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .github/workflows/ci.yml
├── public/                 # manifest, icônes générées, .htaccess
├── src/
│   ├── core/               # logique pure, déterministe (aucun import Phaser)
│   │   ├── sim/            # boucle à pas fixe, monde, collisions (grille)
│   │   ├── entities/       # données : ennemis, portes, caisses, armes
│   │   ├── rules/          # base, contact, redline
│   │   ├── levels/         # configs de paliers, générateur, seeds
│   │   └── rng.ts
│   ├── render/             # Phaser : scènes, skins, juice, HUD
│   │   └── skins/default/  # génération procédurale des textures
│   ├── audio/              # SFX procéduraux + séquenceur chiptune (Web Audio)
│   ├── save/               # IndexedDB, schéma versionné, migrations, export/import
│   ├── i18n/
│   └── main.ts
├── tools/sim/              # simulateur headless + bots
├── tests/
│   ├── unit/               # Vitest
│   └── e2e/                # Playwright
├── android/                # généré par Capacitor (jalon APK)
└── reports/                # sorties du simulateur (gitignoré sauf résumé)
```

## 10. Audio

- **Bruitages** générés à la volée façon jsfxr (tir, impact, porte bonus, porte malus,
  caisse, boss, victoire, défaite). Le tir est fortement limité en fréquence pour ne
  pas saturer.
- **Musique** : petit séquenceur chiptune en Web Audio, 2 boucles (menu, jeu), simples.
- L'audio démarre au premier geste de l'utilisateur (contrainte des navigateurs).
- **Vibrations** via `navigator.vibrate` : porte franchie (court), base touchée (moyen),
  boss vaincu (motif). Elles sont désactivables. Note : elles dépendent aussi des
  réglages système Android.

## 11. Sauvegarde

- IndexedDB : progression (paliers, étoiles par niveau), réglages, records, historique
  de chaque partie (`{ date, mode, levelId, result, stars, durationMs, kills, maxSquad, score }`),
  et la liste des règles déjà présentées.
- Schéma **versionné** avec migrations dès la v1.
- **Export / import** d'un fichier JSON depuis les réglages, avec validation du schéma
  à l'import. C'est la seule protection si les données du navigateur sont effacées.

## 12. Infrastructure

### 12.1 Développement (Docker uniquement)

- `docker-compose.yml` avec un service `app` (image Node LTS) : `npm run dev`,
  Vite écoute sur `0.0.0.0:5173`, code monté en volume, `node_modules` dans un
  volume nommé (évite les conflits entre macOS et Linux).
- Commandes : `dev`, `build`, `test`, `test:e2e`, `sim`, `lint`, toutes lancées via
  `docker compose run --rm app npm run <cmd>`.
- Test rapide sur téléphone : ouvrir `http://<IP-du-Mac>:5173` en Wi-Fi. Cela marche
  pour jouer, mais **sans service worker ni installation**, faute de HTTPS.
- `.env.example` : uniquement des variables non secrètes, comme `VITE_APP_VERSION`.
  Les secrets de déploiement vivent dans les secrets GitHub Actions (§12.3).

### 12.2 PWA

- Manifest : `name: "SblaaafShoot"`, `short_name: "SblaaafShoot"`,
  `display: "fullscreen"`, `orientation: "portrait"`, couleurs de thème issues de la palette.
- Icônes générées par script au build (pas de fichier source requis).
- Service worker : précache de toute l'app, stratégie hors-ligne complète.
  Afficher un message discret « Nouvelle version disponible : recharger ».
- Installation : par Chrome sur Android.

### 12.3 Déploiement web : Hostinger

- Hébergement sur un sous-domaine perso en HTTPS (SSL Hostinger), par exemple
  `shoot.<mondomaine>`.
- Déploiement automatique depuis GitHub Actions, en **SFTP de préférence**, sinon FTPS,
  vers le dossier du sous-domaine. Identifiants dans `secrets.HOSTINGER_*`, jamais dans le repo.
- `public/.htaccess` :
  - `sw.js` et `manifest.webmanifest` en `no-cache` (sinon les mises à jour ne passent pas) ;
  - fichiers hachés par Vite en cache long, immuable ;
  - type MIME `application/manifest+json` pour `.webmanifest` ;
  - redirection HTTP vers HTTPS ;
  - en-têtes de sécurité : `Content-Security-Policy` stricte (sans connexion externe),
    `X-Content-Type-Options`, `Referrer-Policy`. Vérifier que la CSP ne casse pas Phaser
    ou Web Audio avant de la durcir.
- Au jalon concerné, **demande-moi** le type d'offre Hostinger (mutualisé ou VPS) et le
  chemin cible avant d'écrire le workflow.

### 12.4 APK Android : Capacitor

- L'APK est **compilé dans GitHub Actions** (runner Ubuntu) et publié comme artefact
  téléchargeable. Une image Docker locale reste optionnelle.
  Pourquoi : les outils Android sont surtout distribués pour x86_64. Sur un Mac Apple
  Silicon, les faire tourner dans Docker passe par l'émulation, ce qui est lent et
  parfois instable. À vérifier et à signaler lors de ce jalon.
- APK **signé en release** avec un keystore stocké dans les secrets GitHub, pas en debug.
  Pourquoi : Android n'accepte une mise à jour que si elle est signée avec la même clé.
  Perdre la clé oblige à désinstaller l'app, et donc à perdre la sauvegarde
  (d'où l'export JSON).
- `appId: com.sblaaaf.shoot`. Orientation portrait, plein écran, sans barre système.
- Vérifier la taille finale de l'APK et la rapporter.

### 12.5 CI : `.github/workflows/ci.yml`

À chaque push et pull request : lint, tests unitaires, build, simulateur (critères §5.3).
Sur `main`, si tout passe : déploiement Hostinger. L'APK se compile sur tag `v*`,
ou manuellement (`workflow_dispatch`).

## 13. Tests

- **Unitaires (Vitest)**, au minimum : effets de chaque porte (dont arrondis et minimums),
  progression d'une porte modifiable au tir, conservation du DPS avec l'agrégation des
  balles, règles base/contact/redline, calcul des étoiles, déterminisme (une seed donne
  un état identique après N ticks), migrations de sauvegarde, validation de l'import.
- **Simulateur** : critères de §5.3, exécutés en CI.
- **Bout en bout (Playwright, viewport mobile)** : démarrer le jeu, finir le tutoriel
  avec des entrées scriptées, gagner le niveau 1, vérifier qu'une étoile est sauvegardée,
  recharger et constater la persistance.

Exemple attendu de test du point de bascule :

```typescript
import { describe, it, expect } from 'vitest';
import { applyGate } from '../../src/core/entities/gates';

describe('applyGate — point de bascule +10 / ×2', () => {
  it('préfère +10 avec 5 tireurs', () => {
    expect(applyGate(5, { kind: 'add', value: 10 })).toBe(15);
    expect(applyGate(5, { kind: 'mul', value: 2 })).toBe(10);
  });

  it('préfère ×2 avec 20 tireurs', () => {
    expect(applyGate(20, { kind: 'add', value: 10 })).toBe(30);
    expect(applyGate(20, { kind: 'mul', value: 2 })).toBe(40);
  });

  it('ne descend jamais sous 1 tireur avec une division', () => {
    expect(applyGate(1, { kind: 'div', value: 3 })).toBe(1);
  });
});
```

## 14. Jalons

**Règle : à la fin de chaque jalon, arrête-toi, présente le résultat (§ CLAUDE.md) et
attends « OK jalon N ».** Chaque jalon a sa branche `feat/…`.

| # | Jalon | Livrable vérifiable |
|---|---|---|
| 0 | **Socle** | Versions vérifiées et rapportées, Docker + compose, Vite + TS + Phaser, Vitest, lint, CI minimale (lint + test + build), écran « Hello SblaaafShoot » sur le téléphone en Wi-Fi |
| 1 | **Boucle de base** | Core déterministe à pas fixe, escouade qui glisse (contrôle relatif), tir automatique, ennemis basiques qui descendent, règle `base`, victoire/défaite. Placeholders géométriques acceptés |
| 2 | **Mise en ligne précoce** | PWA (manifest, service worker), déploiement Hostinger par la CI, `.htaccess`. Je peux **installer et tester sur mon S23 FE** dès ce jalon |
| 3 | **Portes** | Tous les types de portes, paires, portes modifiables au tir, lisibilité (signes, formes, jauges), tests unitaires |
| 4 | **Caisses et armes** | Caisses à PV, 4 récompenses, agrégation des balles avec conservation du DPS testée |
| 5 | **Ennemis, boss et règles** | Types d'ennemis en données, boss avec barre de PV, règles `contact` et `redline`, cartes de rappel de règle |
| 6 | **Simulateur et 50 niveaux** | Générateur semi-procédural, bots expert et moyen, rapport d'équilibrage, critères de §5.3 dans la CI. **Arrêt obligatoire : je valide les courbes** |
| 7 | **Campagne** | Carte des paliers, déblocage, étoiles, écran de fin, sauvegarde IndexedDB versionnée |
| 8 | **Survie** | Flux sans fin, boss accélérés, glissement bonus/malus, score et record |
| 9 | **Tutoriel** | Camp d'entraînement scénarisé, rejouable, bouton passer |
| 10 | **Habillage** | Skin procédural définitif (bonshommes 3D animés, palette, ombres), juice et son, vibrations |
| 11 | **Statistiques et réglages** | Écran de stats avec graphique, tous les réglages, export/import |
| 12 | **APK** | Capacitor, compilation et signature en CI, taille rapportée, test d'installation |
| 13 | **Audit et finitions** | Mesures de performance et de RAM sur le S23 FE (procédure de débogage distant Chrome fournie), audit accessibilité, `en.json` et sélecteur de langue |

## 15. Hors périmètre V1

Attaques spéciales des boss, ennemis volants, nouvelles armes au-delà des 4 récompenses,
skin pixel art, toute fonctionnalité en ligne (classements, comptes, synchronisation),
version iOS.
