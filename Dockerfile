# Image de développement : Node LTS (Debian slim plutôt qu'Alpine, car
# Playwright et certains binaires natifs exigent la glibc).
ARG NODE_VERSION=24.22.0
FROM node:${NODE_VERSION}-bookworm-slim

WORKDIR /app

ENV NPM_CONFIG_UPDATE_NOTIFIER=false

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh \
  # Un volume nommé hérite des droits du dossier de l'image au premier montage :
  # sans ce chown, l'utilisateur node ne pourrait pas y écrire.
  && mkdir -p /app/node_modules && chown node:node /app/node_modules

# Utilisateur non-root fourni par l'image officielle (uid 1000).
USER node

EXPOSE 5173
ENTRYPOINT ["entrypoint.sh"]
CMD ["npm", "run", "dev"]
