FROM denoland/deno:debian-2.9.6

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Links the image to its repository at publish time, which is what lets the GHCR
# package inherit the repository's visibility instead of landing private.
LABEL org.opencontainers.image.source=https://github.com/Ionaru/fruiz

ARG FRUIZ_GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${FRUIZ_GIT_REVISION}

WORKDIR /app

COPY deno.json deno.lock .
RUN deno ci

COPY drizzle.config.ts vite.config.ts .
COPY tools ./tools
COPY src ./src
RUN deno task build

VOLUME /app/data
EXPOSE 8000

CMD ["deno", "task", "start"]
