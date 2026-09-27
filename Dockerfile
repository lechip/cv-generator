FROM mcr.microsoft.com/playwright:v1.62.1-noble

ARG PNPM_VERSION=10.17.1

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends pandoc libreoffice-writer \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /workspace
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

ENTRYPOINT ["pnpm", "cv"]
CMD ["--help"]
