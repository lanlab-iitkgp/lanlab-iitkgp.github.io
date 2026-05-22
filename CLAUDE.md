# LAN Lab Website

Static GitHub Pages site for the **Learning and Automation for Networks (LAN) Lab**
at the G.S. Sanyal School of Telecommunications, IIT Kharagpur. PI: Dr. Dibbendu Roy.

Repository: https://github.com/lanlab-iitkgp/lanlab-iitkgp.github.io
Deployed at: https://lanlab-iitkgp.github.io/

## Why this revamp exists

The repo was previously a personal academic site (Dibbendu Roy @ IIT Indore). It is
being re-framed as a lab site (LAN Lab @ IIT Kharagpur) while preserving the existing
URL so external links don't break. The PI bio becomes one page under the lab; the lab
identity becomes the top-level brand.

## Tech stack

- Plain HTML5 + CSS3 + minimal vanilla JS. No build step, no framework.
- **Exception to "minimal JS":** the hero background runs a small vanilla-JS
  `<canvas>` network-constellation animation (`assets/js/main.js`). No
  libraries — this is a deliberate, approved exception for the lab's
  signature visual.
- Hosted via GitHub Pages from `main` branch (root).
- Fonts: Inter via Google Fonts.
- All work happens on branch `lan-lab-revamp`; merged to `main` only when ready.
- The user pushes commits manually; do NOT push automatically.

## Current state of the legacy site (as of revamp start)

Live files actually used:
- `index.html` (loads `style.css`, `script.js`) — landing + about + publications + contact
- `research.html`, `teaching.html`, `positions.html` — each embed their own inline `<style>`
- `style.css` (~920 lines, crimson theme, template by CodingNepal)
- `script.js` (jQuery: sticky nav, scroll-up, Typed.js, Owl Carousel)
- `DibbenduResume.pdf`
- `images/` (19 files)

Dead / unused files (safe to delete in the cleanup commit):
- `page.html` — placeholder boilerplate (Lorem ipsum, [Name] tags)
- `styles.css` — only used by `page.html`
- `styleResearch.css` — not referenced anywhere
- `styleTeach.css` — not referenced anywhere
- `DibbenduResume.zip` — duplicate of the PDF
- `.DS_Store` — macOS metadata

Known bugs in current site:
- `teaching.html` lines 172, 174 — Google Classroom hrefs missing opening quote
- `style.css` line 917 — stray `*/` after commented block

## Target directory layout

```
/
├── index.html              # lab landing (Home)
├── pages/
│   ├── people.html
│   ├── research.html
│   ├── publications.html   # split out from index.html
│   ├── teaching.html
│   ├── openings.html       # renamed from positions.html
│   └── dibbendu-roy.html   # Dibbendu's personal bio
├── assets/
│   ├── css/
│   │   ├── main.css        # tokens, layout, nav, hero
│   │   └── components.css  # cards, badges, pub entries
│   ├── js/
│   │   └── main.js         # minimal vanilla JS, no jQuery
│   ├── img/                # was images/
│   └── svg/
│       └── logo.svg        # LAN Lab logo
├── DibbenduResume.pdf
├── index-legacy.html       # the old personal site, preserved during transition
├── .gitignore
└── README.md
```

Old jQuery/Typed.js/Owl Carousel dependencies are being dropped in favor of
plain vanilla JS.

## Design system

Dark theme. Always use CSS variables defined in `assets/css/main.css`:

- `--bg` `#0f1419` — page background
- `--surface` `#1a2128` — cards, nav
- `--text` `#e6e8eb` — body text
- `--muted` `#8b95a1` — secondary text
- `--accent` `#2dd4bf` — teal (links, primary accents)
- `--accent-2` `#f59e0b` — amber (highlights, CTAs)
- `--border` `#2a323c`

Typography: Inter, sans-serif. Body line-height 1.6. Headings tight (1.15).

## Information architecture

Top nav: **Home · People · Research · Publications · Teaching · Openings**

Home (`index.html`) sections, top to bottom:
1. Hero (lab name + tagline)
2. Research thrusts (4 cards): Causal AI for Networks · RL & Control ·
   Game Theory & Mechanism Design · 6G / O-RAN & Optical Access
3. News strip (latest 3–4 dated items)
4. Collaborators / sponsors strip
5. CTA → openings

## Content rules

- **Affiliation everywhere**: IIT Kharagpur, GSSST. Not IIT Indore. Historical
  mentions like "previously at IIT Indore" are fine where contextually correct.
- **PI bio is in `pages/dibbendu-roy.html`** — not on the home page.
- **Publications**: group by area (as in current index.html), bold the PI's
  name in author lists, always link DOI / arXiv when available.
- **Collaborators to credit**: Prof. James Gross (KTH), Prof. Goutam Das (IIT
  KGP), Prof. Tansu Alpcan (Melbourne), Prof. Marimuthu Palaniswami (Melbourne),
  Ericsson Research.

## Publications pipeline

The Publications page is auto-updated, not hand-maintained:

- `scripts/fetch-publications.py` — standard-library Python (no pip deps).
  Resolves the PI's ORCID (`0000-0002-2246-9905`) to an OpenAlex author id,
  cursor-paginates all works, de-duplicates preprint/published pairs by title
  similarity, and writes `assets/data/publications.json`.
- `pages/publications.html` + `assets/js/publications.js` render that JSON
  in-browser, grouped by year. The browser reads the committed JSON only — it
  never calls OpenAlex directly.
- `.github/workflows/update-publications.yml` re-runs the script weekly (Monday
  06:00 UTC) and on manual dispatch, committing the JSON only when it changed.
  It activates once the repo is on GitHub with the workflow on the default
  branch.

To refresh the data locally: `python3 scripts/fetch-publications.py`.

## Workflow

- All edits on branch `lan-lab-revamp`. Do not commit to `main` directly.
- Before any big restructuring, propose the plan first; wait for approval.
- After each meaningful chunk of work, run `git status` and `git diff`, then
  commit with a clear message.
- DO NOT `git push` — the user pushes manually when ready.
- For local preview, suggest `python3 -m http.server 8000` from the repo root.

## Things NOT to do

- Don't add a build tool (Webpack, Vite, npm) unless explicitly asked.
- Don't convert to Jekyll/Hugo yet — that's a later decision.
- Don't delete `index-legacy.html` once it's created — it's the safety net.
- Don't reproduce copyrighted content (paper abstracts >1–2 sentences,
  university branding, third-party logos without permission).
- Don't bring back jQuery/Typed.js/Owl Carousel — vanilla JS only.
