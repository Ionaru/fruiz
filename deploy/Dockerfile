FROM denoland/deno:alpine-2.7.11

RUN deno x --install-alias

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}

WORKDIR /app

COPY deno.json deno.lock .
RUN deno install --frozen

COPY drizzle.config.ts vite.config.ts .
COPY src ./src
RUN deno task build

VOLUME /app/data
EXPOSE 8000

CMD ["deno", "task", "start"]
