# Pinned production build for Railway.
#
# Why an explicit Dockerfile instead of the auto-detected builder: the host
# builder reuses a cached node_modules between builds, and after a failed
# @stellar/stellar-sdk v17 install that cache left a mixture of v17 and v16 files
# behind. The build then reported installing 16.3.0 while webpack resolved a path
# (`./xdr/index.js`) that only exists in the v17 layout. `npm ci` deletes
# node_modules first, which is exactly the property that was missing.
#
# Node 22 matches .nvmrc and satisfies @supabase/supabase-js, which requires
# >=22.0.0 (Node 20 produced an EBADENGINE warning at install time).

FROM node:22-bookworm-slim AS deps
WORKDIR /app

# .npmrc must be copied before installing. It sets legacy-peer-deps=true, and
# package-lock.json was authored with that setting. Omit it and `npm ci` rejects
# the lockfile as out of sync:
#   Invalid: lock file's picomatch@2.3.2 does not satisfy picomatch@4.0.7
#
# scripts/ is copied too because `npm ci` runs the root `prepare` script
# (`node scripts/setup-git-hooks.mjs`). That script is a documented no-op outside
# a git checkout and exits 0, but it still has to exist or node fails the install.
COPY package.json package-lock.json .npmrc ./
COPY scripts ./scripts

# devDependencies are required, not optional: `next build` needs typescript,
# tailwindcss and eslint. NODE_ENV=production would omit them.
ENV NODE_ENV=development
RUN npm ci --no-audit --no-fund --include=dev

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js inlines NEXT_PUBLIC_* into the client bundle at build time, and
# lib/supabase.js throws while collecting page data when the Supabase pair is
# absent, so the build cannot succeed without them. Railway supplies service
# variables to the build as Docker build args, which only reach the image when
# declared here. Kept in sync with .env.local.example.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_STELLAR_NETWORK
ARG NEXT_PUBLIC_CHECKOUT_CONTRACT_ID
ARG NEXT_PUBLIC_EMAILJS_SERVICE_ID
ARG NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
ARG NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
ARG NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_STELLAR_NETWORK=$NEXT_PUBLIC_STELLAR_NETWORK
ENV NEXT_PUBLIC_CHECKOUT_CONTRACT_ID=$NEXT_PUBLIC_CHECKOUT_CONTRACT_ID
ENV NEXT_PUBLIC_EMAILJS_SERVICE_ID=$NEXT_PUBLIC_EMAILJS_SERVICE_ID
ENV NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=$NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
ENV NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=$NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
ENV NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL=$NEXT_PUBLIC_DEFAULT_RECIPIENT_EMAIL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

EXPOSE 3000
CMD ["npm", "start"]
