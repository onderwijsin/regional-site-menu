# Manual `studio.repository.branch` is overwritten by CI auto-detection in production builds

## Summary

When `studio.repository.branch` is explicitly configured in `nuxt.config.ts`, production builds
running in GitHub Actions overwrite that manual branch with `GITHUB_REF_NAME`.

This makes Nuxt Studio publish to the deployment branch instead of the configured content branch. It
also contradicts the Git providers documentation, which states that manually configured repository
values take precedence over auto-detection.

## Version

- `nuxt-studio`: `1.7.0`
- Deployment/build environment: GitHub Actions
- Repository provider: GitHub

## Configuration

```ts
export default defineNuxtConfig({
  modules: ['nuxt-studio'],
  studio: {
    repository: {
      provider: 'github',
      owner: 'onderwijsin',
      repo: 'regional-site-menu',
      branch: 'content'
    }
  }
})
```

The production site is built and deployed from `main`, but Studio should publish content edits to
`content`.

## Expected Behavior

Nuxt Studio should publish to the manually configured branch:

```txt
content
```

The docs say:

> Auto-detection only applies when `owner` and `repo` are not set in your `nuxt.config.ts`. Any
> manually configured values always take precedence.

## Actual Behavior

During a production build in GitHub Actions, Studio resolves the repository branch to:

```txt
main
```

Publishing then attempts to commit to `main`, which fails for repositories where `main` has branch
protection rules. In our case this produces a GitHub API `422` response.

## Root Cause

In `dist/module/module.mjs`, production builds call `detectRepositoryFromCI()`.

For GitHub Actions, that returns:

```js
{
  provider: 'github',
  owner,
  repo,
  branch: process.env.GITHUB_REF_NAME
}
```

The detected values are then merged before the manual module options:

```js
options.repository = defu(detectedWithoutProvider, options.repository)
```

Because `defu` gives precedence to the first object, `GITHUB_REF_NAME` wins over
`studio.repository.branch`.

Minimal reproduction of the merge behavior:

```js
import { defu } from 'defu'

console.log(defu({ branch: 'main' }, { branch: 'content' }))
// => { branch: 'main' }
```

## Suggested Fix

Reverse the merge order so explicit module options win and CI detection only fills missing fields:

```diff
- options.repository = defu(detectedWithoutProvider, options.repository)
+ options.repository = defu(options.repository, detectedWithoutProvider)
```

That matches the documented precedence:

- manual `studio.repository.*` values are preserved
- CI-detected values are still useful as fallbacks when fields are omitted

## Workaround

We are carrying a local `pnpm` patch with the merge order reversed so Studio publishes to the
configured `content` branch.
