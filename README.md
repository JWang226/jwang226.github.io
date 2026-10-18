# Jinzhao Wang's website

A static research website for [wangjinzhao.com](https://wangjinzhao.com), with research, publications, a blog, and a printable CV. The current affiliation is **Research Scientist at Zyphra**.

## Develop locally

Use Node.js 22 or later. From the project directory:

```sh
npm ci
npm run build
npm run check
npm run serve
```

Open [localhost:4173](http://localhost:4173). Rebuild after editing source files and refresh the browser. The generated website is in `dist/`; edit source files rather than generated HTML. `npm run check` validates the built website.

## Edit content

- `data/site.json`: name, affiliation, social links, site URL, and search description.
- `data/publications.json`: publication metadata and verified links. Follow the structure of an existing entry; keep stable arXiv IDs in `id`, author names in `authors`, topic names in `topics`, the original arXiv year in `preprintYear`, and the publication or acceptance year in `year`. A journal uses `{ "name": "...", "url": "..." }`; use `null` for an unpublished preprint. Conference, recording, slides, and code links belong in the `links` array as `{ "label": "...", "url": "..." }`. `featured` selects highlighted papers. Research pages use the `Quantum` and `Gravity` topic classifications; add `AI/LLM` only for relevant work.
- `data/presentations.json`: the full CV presentation list, grouped by year and month. A `talkUrl` matches a verified resource in `data/talks.json`; `presenter` explicitly credits a presentation delivered by someone else.
- `data/talks.json`: verified talk resources and recordings, linked to publications by `arxivIds`. Add each recording to the relevant paper’s `links` array as well. Identify every `speaker`; coauthor talks require a recording and use `Coauthor talk · Speaker Name` labels. Omit coauthor event links and CV entries without a verified recording.
- `data/sources.json`: the source audit and corrections to older CV metadata. Record primary sources here when adding or updating publications. Use full HTTPS URLs and omit links that have not been verified.
- `data/external-posts.json`: writing published elsewhere, with its original title, date, source link, and attribution. Set `researchTopics` (for example `["AI/LLM"]`) to feature an article in that research section; `kind` distinguishes coauthored articles from guest writing.
- `scripts/build.mjs`: page copy, research descriptions, and the online CV.
- `assets/`: styles, scripts, fonts, and images.

The CV page groups presentations into collapsible years, with the newest year expanded by default. Year links open their target group. **Print / Save PDF** includes every year and restores the screen’s expanded groups afterward. The supplied source CV is not published: its phone number and referee contact details are excluded from the public version, and the current affiliation reflects the owner's confirmed update. Update the online CV in `scripts/build.mjs` when experience changes.

### Add a blog post

Create `content/blog/your-post-slug.md`. The filename, without `.md`, becomes the post's URL slug. Start with front matter:

```md
---
title: Your post title
date: 2026-10-17
description: A short description for the blog listing and search previews.
tags: AI, Quantum
---

Write the post here in Markdown.
```

Use an ISO date (`YYYY-MM-DD`), a unique filename with lowercase letters and hyphens, and a concise description. Rebuild and preview the result before publishing. No example articles are published automatically.

## Publish with GitHub Pages

1. Create or use the repository **`JWang226/jwang226.github.io`**. A GitHub user site uses a repository named after the account's lowercase GitHub Pages domain.
2. Push this source project to its `main` branch, including `package-lock.json` and `.github/workflows/pages.yml`.
3. In the repository, open **Settings → Pages → Build and deployment**, then set **Source** to **GitHub Actions**.
4. Open **Actions → Deploy GitHub Pages** and run the workflow, or push another commit to `main`.
5. After the workflow succeeds, visit [wangjinzhao.com](https://wangjinzhao.com). Later pushes to `main` build, check, and deploy automatically.

The workflow installs the locked dependencies, builds into `dist/`, checks the output, uploads it with GitHub's official `upload-pages-artifact` action, and publishes with `deploy-pages`. Its deployment job uses the `github-pages` environment and the required Pages and identity-token permissions. No personal access token or separate hosting service is needed.

For deployment settings and troubleshooting, see GitHub's [custom Pages workflows documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [user-site setup instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site). The primary custom domain is `wangjinzhao.com`; configure it in the repository's Pages settings and keep `data/site.json` in sync if it changes.
