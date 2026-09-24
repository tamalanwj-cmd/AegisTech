# ---- build stage: compile the CRA production bundle ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# NocoDB connection, baked into the bundle at build time.
# Defaults point at the nginx /nocodb proxy (same origin), so the image works
# on any host/IP without a rebuild. Override with --build-arg when needed.
ARG NOCODB_URL=/nocodb
ARG NOCODB_BASE_ID=pm23znilouha1mk
ARG NOCODB_TABLE_ID=mrn5twliwasjyet
ARG NOCODB_TOKEN=nc_pat_GD2Zlk0NAByvV3Qqi5JttB2abkskRo2HgQJPuoDQ

ENV REACT_APP_NOCODB_URL=${NOCODB_URL:-/nocodb}
ENV REACT_APP_NOCODB_BASE_ID=${NOCODB_BASE_ID:-pm23znilouha1mk}
ENV REACT_APP_NOCODB_TABLE_ID=${NOCODB_TABLE_ID:-mrn5twliwasjyet}
ENV REACT_APP_NOCODB_TOKEN=${NOCODB_TOKEN:-nc_pat_GD2Zlk0NAByvV3Qqi5JttB2abkskRo2HgQJPuoDQ}

RUN CI=false npm run build

# ---- serve stage: nginx static hosting + NocoDB reverse proxy ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
