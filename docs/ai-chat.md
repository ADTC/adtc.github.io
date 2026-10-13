# AI résumé chat

The "Ask about my work" section at the top of the résumé page is a chat assistant that answers visitors' questions from the résumé. It runs on a Vercel Function that calls Google's Gemini 2.5 Flash-Lite through [Vercel AI Gateway](https://vercel.com/docs/ai-gateway), paid for by AI Gateway's free monthly credit.

## How it works

1. The site stays a static Astro build on GitHub Pages. `src/components/Ask.astro` renders the chat section and sends each question, with the earlier turns of the conversation, to `https://adtc-resume-chat.vercel.app/api/chat`.
2. That endpoint is the Vercel project **adtc-resume-chat** in the Hobby team **ADTC's projects** (`adtcs-projects`). Its code is in `chat-api/`.
3. The function checks the request, adds the assistant's rules and the full résumé text, and streams the model's answer back as plain text.
4. The function signs in to AI Gateway with the OIDC token Vercel gives every deployment, so there are no API keys to manage or leak.

The résumé text is built from `src/data/resume.json` and `src/site.ts` when the function is built, so the function has to be redeployed when the résumé changes. Every push to `master` does that automatically.

## Files

| Path | Purpose |
| --- | --- |
| `src/components/Ask.astro` | Chat section markup and browser script |
| `src/styles/global.css` (the `Ask` block) | Chat section styles |
| `src/site.ts` (`chatApi`) | URL of the chat endpoint |
| `chat-api/api/chat.ts` | The Vercel Function: request checks, model call and streaming |
| `chat-api/lib/instructions.ts` | The assistant's rules and the résumé text given to the model |
| `chat-api/package.json` | The function's own dependencies and type-check script |

## What's set up in Vercel

Everything was done with the Vercel CLI, always scoped to `adtcs-projects`. The Vercel MCP server wasn't used because it's only authorized for the Hire Digital team.

```sh
vercel project add adtc-resume-chat --scope adtcs-projects
vercel project update adtc-resume-chat --root-directory chat-api --framework other --node-version 24.x --scope adtcs-projects --yes
vercel link --project adtc-resume-chat --scope adtcs-projects --yes
vercel build --prod
vercel deploy --prebuilt --prod --scope adtcs-projects
vercel git connect https://github.com/ADTC/adtc.github.io.git --scope adtcs-projects --yes
vercel firewall rules add "Rate limit chat API" \
  --description "Max 20 chat requests per IP per 10 minutes" \
  --condition '{"type":"path","op":"eq","value":"/api/chat"}' \
  --condition '{"type":"method","op":"eq","value":"POST"}' \
  --action rate_limit --rate-limit-window 600 --rate-limit-requests 20 --rate-limit-keys ip --rate-limit-action rate_limit \
  --project adtc-resume-chat --scope adtcs-projects --yes
vercel firewall publish --project adtc-resume-chat --scope adtcs-projects --yes
```

As a result:

- The project builds only `chat-api/`, with no framework preset, on Node.js 24.
- It's deployed to production at `https://adtc-resume-chat.vercel.app`.
- It's connected to the GitHub repo `ADTC/adtc.github.io`, with `master` as the production branch.
- The rate-limit rule is published.
- This folder is linked to the project. `.vercel/` and the local OIDC token in `.env.local` are gitignored.

Three default settings matter and were left on:

- **Include files outside the root directory.** The function needs it to read `src/data/resume.json` and `src/site.ts`.
- **Deployment protection.** Preview and per-deployment URLs need a Vercel login, while the production domain `adtc-resume-chat.vercel.app` stays public, which the site needs.
- **Fluid compute in `iad1`** (Washington, D.C.).

## Card verification

AI Gateway refuses requests until the team has a credit card on file, even for the free credit. ADTC's projects has one. It was added from the dashboard's **AI Gateway** page, using **Use Free AI Gateway Credit** with **ADTC's projects** selected (not Hire Digital). The card isn't charged.

On that page, skip **Create Key**. The function signs in with Vercel's OIDC token instead, and an `AI_GATEWAY_API_KEY` environment variable would override it, even if the key were invalid.

To keep it free, leave auto top-up off (the default) and don't buy AI Gateway credits. Buying any moves the team to the paid tier and ends the free monthly credit.

## Checking that it works

```sh
curl -X POST https://adtc-resume-chat.vercel.app/api/chat \
  -H 'Origin: https://adtc.github.io' -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Where is Arundas based?"}]}'
```

This should print a short answer. If you get `{"error":"unavailable"}`, see [Troubleshooting](#troubleshooting).

## Deployments

- Every push to `master` redeploys the function to production. That's how résumé updates reach the assistant: run `npm run import-resume`, commit and push as usual.
- Pushes to other branches create preview deployments behind a Vercel login. They don't affect the live site.

## Costs and limits

- **AI Gateway free tier:** $5 of credit every 30 days, counted from the first request, for a subset of models with lower per-model rate limits.
- **Cost per question:** Gemini 2.5 Flash-Lite costs $0.10 per million input tokens and $0.40 per million output tokens. A question sends the rules and résumé (about 6,500 tokens) and gets a few hundred tokens back, so it costs roughly $0.0008. That's about 6,000 questions a month. Follow-up questions cost more, because the conversation so far is sent again.
- **When the credit runs out**, the chat says the assistant isn't available until the credit refreshes. Nothing is charged.
- **Vercel Hobby** includes 1,000,000 function invocations, 4 hours of active CPU and 360 GB-hours of memory a month, far more than this uses.
- **Firewall:** Hobby allows one rate-limit rule per project (this one), with 1,000,000 allowed requests a month.

Spending shows in the dashboard under **AI Gateway** for ADTC's projects.

## Abuse protection

- **Origin check:** the function only answers requests whose `Origin` header is in `ALLOWED_ORIGINS`. This stops other websites from using it through their visitors' browsers. Scripts can fake the header, so it isn't the main defense.
- **Size limits:** questions can be up to 500 characters, a request can carry up to 11 messages (the new question plus five earlier exchanges), and answers stop at 600 tokens. The page applies the same limits.
- **Rate limit:** the firewall rule lets each IP address send 20 chat requests per 10 minutes. Extra requests get HTTP 429, which the chat shows as "please wait".
- **Hard cap:** without purchased credits, the worst case is that the assistant stops answering until the credit refreshes.

## Privacy

- Visitors' questions go from the function to AI Gateway and then to Google. Vercel says AI Gateway neither trains on nor keeps prompts, and AI Gateway's model catalog marks Gemini 2.5 Flash-Lite as not training on prompts with any of its providers.
- The function doesn't store conversations. Vercel's runtime logs record each request and AI Gateway's error messages, but not the questions.
- The page keeps the current conversation in the browser's session storage, so reloading the tab shows it again. **New chat** or closing the tab clears it.
- The model only sees the public résumé. Its rules tell it never to guess contact details, and the résumé has none.

## Local development

The local site uses the production endpoint by default, because `http://localhost:4321` is an allowed origin. Running `npx astro dev --background` is enough to try the chat.

To work on the function itself, run these from the repo root:

```sh
(cd chat-api && npm install)
vercel link --project adtc-resume-chat --scope adtcs-projects   # only needed on a fresh clone
vercel dev --listen 3000
PUBLIC_CHAT_API=http://localhost:3000/api/chat npx astro dev --background
```

`vercel dev` refreshes the AI Gateway token by itself. Run `npm run check` in `chat-api/` to type-check the function. Setting `PUBLIC_CHAT_API=` (empty) hides the chat section locally.

## Configuration

| Setting | Where | Default |
| --- | --- | --- |
| Model | `CHAT_MODEL` environment variable on the Vercel project | `google/gemini-2.5-flash-lite` |
| Allowed origins | `ALLOWED_ORIGINS` environment variable, comma-separated | `https://adtc.github.io,http://localhost:4321` |
| Endpoint the site calls | `chatApi` in `src/site.ts`, or `PUBLIC_CHAT_API` at build time | `https://adtc-resume-chat.vercel.app/api/chat` |
| Heading, suggestions and notes | `src/components/Ask.astro` | |
| Assistant rules | `chat-api/lib/instructions.ts` | |

To change the model, pick one from the [free-tier model list](https://vercel.com/ai-gateway/models?freeTier=true). Set `CHAT_MODEL` under the project's **Settings → Environment Variables** for Production, then redeploy. Pricier models use up the credit faster. For example, Gemini 3.1 Flash-Lite costs about 2.5 times as much per question.

The note under the prompt box says questions "aren't used for training". That holds for Gemini 2.5 Flash-Lite, which AI Gateway's model catalog lists as `no_training: all`. Before switching models, check the new model's entry at `https://ai-gateway.vercel.sh/v1/models`, and change the note in `src/components/Ask.astro` if it doesn't say `all`.

## Troubleshooting

- **The chat says the assistant isn't available.** Check the function's error logs:

  ```sh
  vercel logs --project adtc-resume-chat --scope adtcs-projects --environment production --level error --since 1h -x
  ```

  Look for lines starting with `Chat model error:`. They contain only AI Gateway's error message, never the visitor's question.
  - "AI Gateway requires a valid credit card on file": the team has no card on file. See [Card verification](#card-verification).
  - A message about the free tier: the model isn't in the free tier. Change `CHAT_MODEL`.
  - A message about credits or balance: the month's credit is used up until it refreshes.
- **The browser console shows a CORS error.** The page's origin isn't in `ALLOWED_ORIGINS`.
- **A request redirects to a Vercel login page.** It went to a per-deployment URL. Use `https://adtc-resume-chat.vercel.app` instead.
- **HTTP 429.** Either the firewall rule or AI Gateway's free-tier rate limit kicked in. Wait a few minutes.

## Turning it off

- **Hide the chat:** set `chatApi` to `""` in `src/site.ts` and push. The section disappears and nothing else changes.
- **Stop the endpoint:** run `vercel project pause adtc-resume-chat --scope adtcs-projects`. Run `vercel project resume adtc-resume-chat --scope adtcs-projects` to undo it.
