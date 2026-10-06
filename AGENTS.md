## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Resume content

This repo is public. `src/data/resume.json` is generated from the resume Markdown in the private `resume-hd` repo by `npm run import-resume` (see `scripts/import-resume.ts`). Don't edit the JSON by hand; change the Markdown and re-run the import. Never add a street address, phone number or email address to this repo.

Deployment: `.github/workflows/deploy.yml` builds with `withastro/action` and deploys to GitHub Pages on every push to `master`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
