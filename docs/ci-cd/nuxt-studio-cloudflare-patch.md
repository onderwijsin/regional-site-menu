# Nuxt Studio Cloudflare Patch (Temporary)

This project currently applies a `pnpm` patch to `nuxt-studio` to keep production builds working on
Cloudflare Workers.

## Why This Exists

Production builds (Nitro preset `cloudflare_module`) can fail with:

```text
Error: Cannot resolve "@img/sharp-wasm32/versions"
from "sharp/lib/utility.js" and externals are not allowed
```

`nuxt-studio` pulls in an IPX image pipeline that imports `ipx`, which in turn pulls `sharp`.
`sharp` is not edge-safe in this build target.

Related upstream issue:

- <https://github.com/nuxt-content/nuxt-studio/issues/397>

## What We Patched

The patch is declared in:

- `package.json` (`pnpm.patchedDependencies`)

Patch file:

- `patches/nuxt-studio@1.5.1.patch`

The patch changes Nuxt Studio's internal media IPX helper:

- removes static import of `ipx`
- replaces transform initialization with a fallback that throws `IPX_UNAVAILABLE`

Effectively:

- Nuxt Studio remains available in production
- Studio IPX image transforms are disabled for this runtime
- build no longer tries to bundle `sharp` through this code path

## When To Remove This Patch

As soon as upstream issue #397 is resolved and a fixed `nuxt-studio` version is available.

Remove steps:

1. Upgrade `nuxt-studio` to a version that contains the fix.
2. Remove `pnpm.patchedDependencies.nuxt-studio@...` from `package.json`.
3. Delete `patches/nuxt-studio@1.5.1.patch`.
4. Run `pnpm install` to refresh `pnpm-lock.yaml`.
5. Run `pnpm build` and confirm Cloudflare-target build succeeds without this patch.
