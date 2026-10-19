# SblaaafShoot

Jeu mobile de type _lane defense / gate shooter_, en portrait et 100 % hors-ligne.
Le cahier des charges est dans [`docs/SPEC.md`](docs/SPEC.md).

## Prérequis

Uniquement **Docker Desktop**, qui doit être lancé. Aucune installation locale de Node.

## Commandes

Les dépendances s'installent automatiquement au premier lancement, puis à chaque
modification de `package-lock.json`. Elles vont dans un volume Docker nommé.

| Action                        | Commande                                           |
| ----------------------------- | -------------------------------------------------- |
| Serveur de dev                | `docker compose up`                                |
| Tests unitaires               | `docker compose run --rm app npm run test`         |
| Lint (ESLint + Prettier)      | `docker compose run --rm app npm run lint`         |
| Formater le code              | `docker compose run --rm app npm run format`       |
| Vérification des types        | `docker compose run --rm app npm run typecheck`    |
| Build de production (`dist/`) | `docker compose run --rm app npm run build`        |
| Ajouter une dépendance        | `docker compose run --rm app npm install <paquet>` |

Le serveur de dev peut aussi se lancer avec
`docker compose run --rm --service-ports app npm run dev`. Sans `--service-ports`,
`run` n'ouvre pas le port 5173.

## Tester sur le téléphone (Wi-Fi)

1. Lancer `docker compose up`.
2. Trouver l'IP du Mac : `ipconfig getifaddr en0`.
3. Sur le téléphone, connecté au même Wi-Fi, ouvrir `http://<IP-du-Mac>:5173`.

Sans HTTPS, il n'y a ni service worker ni installation PWA. Ces deux points arrivent
au jalon 2.
