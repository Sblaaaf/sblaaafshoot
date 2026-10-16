# CLAUDE.md — SblaaafShoot

Fichier lu automatiquement à chaque session. Il reste volontairement court :
le cahier des charges complet est dans `docs/SPEC.md`.

## Règles de travail (non négociables)

1. **Un seul jalon à la fois.** Lis la section du jalon en cours dans `docs/SPEC.md`
   (§14). Ne commence jamais le jalon suivant sans un "OK jalon N" explicite.
2. **Fin de jalon = arrêt.** Fournis : ce qui a été fait, comment le tester
   (commandes + test sur téléphone), les écarts éventuels avec la spec,
   et le(s) message(s) de commit proposé(s). Puis attends.
3. **Pas de suppositions.** Si un point de la spec est ambigu ou contradictoire,
   pose la question avant de coder. Si tu n'es pas sûr d'une API ou d'une version,
   vérifie (doc officielle / npm) plutôt que de deviner.
4. **Explique le pourquoi** des choix techniques non évidents, brièvement.
5. **Docker d'abord** : aucune installation locale requise hors Docker.
   Toutes les commandes passent par `docker compose`.

## Conventions

- Langue : identifiants de code en anglais ; commentaires, docs et commits en français ;
  textes d'interface uniquement via `src/i18n/fr.json`.
- TypeScript strict. Fonctions fléchées, camelCase (variables/fonctions), PascalCase (classes/types).
- Commente le non-évident (maths d'équilibrage, pooling, pas fixe), pas l'évident.
- Commits conventionnels : `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `perf:`, `ci:`.
- Branches : `main` toujours jouable ; une branche `feat/<sujet>` par jalon, fusion après validation.
- Toute logique de jeu nouvelle = au moins un test unitaire Vitest.
- La logique de jeu (`src/core/`) n'importe **jamais** Phaser (voir SPEC §9).

## Sécurité

- Aucun secret dans le repo (identifiants FTP, keystore Android → secrets GitHub Actions).
- Signale toute pratique risquée en production.
