# One image for every runnable package. Compose picks the entrypoint, so all
# builds run identical Node, identical flags and identical base layers.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
COPY packages ./packages
COPY implementations ./implementations
RUN npm ci
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
# SERVICE_ENTRY is set per service in docker-compose.yml.
ENV SERVICE_ENTRY=implementations/modular-monolith/dist/server.js
CMD ["sh", "-c", "node $SERVICE_ENTRY"]
