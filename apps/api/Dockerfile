FROM node:20-alpine AS runner

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/validation-core/package.json packages/validation-core/package.json

RUN pnpm install --frozen-lockfile --filter @normy/api... --prod

COPY apps/api apps/api
COPY packages/shared packages/shared
COPY packages/validation-core packages/validation-core

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["pnpm", "--filter", "@normy/api", "start"]
