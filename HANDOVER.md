# Bingemind static site handover

## 2026-11-16: SEO-2 (local only)
- Added the SEO-2 data, post-processing script and static checks after syncing `origin/main` at `40a16bc`. Set 32 variants to noindex, removed their sitemap entries and updated metadata on 3 tool pages. All content after `</head>` stays unchanged.
- Script counts: run 1 set noindex on 32 pages, removed 32 sitemap URLs and updated snippets in 3 files; run 2 printed 0, 0, 0 and left all file hashes and modification times unchanged.
- Not pushed. Owner approves before push.

## 2026-11-16: SEO-2 retry (stopped before implementation)
- Reused `../bingemind-seo2-wt` on `seo-cleanup-2` at `b89cba2`. The barbell substring issue is fixed in the brief. A new mismatch blocks Step B: each old description occurs once in a visible `<main>` paragraph, so replacing all five occurrences violates the unchanged-main rule and preservation check. Independent read-only review confirmed it.
- Script counts: run 1 not run; run 2 not run. No HTML, sitemap or script changes. Overwrote `../briefs/adsense-seo-2-2026-11-16-REPORT.md` with evidence. Next: reconcile Step B, the old-description absence assertion and the main-preservation requirement in the brief.
- Not pushed. Owner approves before push.

## 2026-11-16: SEO-2 (local only)
- Created `seo-cleanup-2` at `b89cba2` in `../bingemind-seo2-wt`. Stopped before implementation: the new barbell description contains the old description, which conflicts with repeat-run and old-string absence requirements. Report: `../briefs/adsense-seo-2-2026-11-16-REPORT.md`.
- Script counts: run 1 not run; run 2 not run. No HTML, sitemap or script changes. Resume after the brief resolves the mismatch.
- Not pushed. Owner approves before push.

## 2026-11-15: SEO-1 (local only)
- Added `scripts/site-seo.mjs` and SEO checks in `scripts/check-site.py`. All static checks and 13 consent checks pass. Browser preview is blocked by sandbox socket permissions. Review details: `SEO-1-REPORT.md`.
- Run 1: scanned 393 HTML, noindex set on 88 policy pages, 84 sitemap URLs removed, top menu added to 393 pages. Run 2: scanned 393 HTML, 0 noindex changes, 0 sitemap URLs removed, 0 menus added; file hashes and modification times unchanged.
- Not pushed. Owner approves before push.

## 2026-11-12: AdSense fixes, local only
- Implemented the approved brief at `../briefs/adsense-fixes-2026-11-12.md`. New indexable pages: `/about/`, `/contact/`, `/terms/`, `/services/`. Home now leads with eight tools. The agency visual, form and copy live on `/services/`. Former home anchors still resolve to the business-services section.
- All 401 HTML pages include site links, Cookie settings and a deferred consent script. Analytics loads only after acceptance on the live host. Advertising remains denied by default and needs Google's separate consent message. Existing AdSense loaders and all 393 tool main bodies are unchanged. Galactic pages retain their no-analytics setting.
- Release step: run node scripts/site-footer.mjs after copying tool builds
  Then run node scripts/site-seo.mjs (noindex per-tool policy pages, tool sitemaps, shared top menu).
  Then run node scripts/site-seo-2.mjs (noindex 32 zero-impression variant pages, 3 tool snippets).
- Checks: `node scripts/check-consent.mjs` passes 10 isolated logic checks; `python3 scripts/check-site.py` passes links, metadata, preservation and repeat-run checks. The preservation check compares with the preceding commit when this handover is the current HEAD. No packages needed.
- Independent static review completed. Four findings fixed and rechecked. HTTP preview, browser interaction, phone overflow, tap measurements and desktop/phone screenshots remain blocked by this session's sandbox. No screenshot exists yet. Do not release before those checks and the owner's home-page preview.
- Report: `../briefs/adsense-fixes-2026-11-12-REPORT.md`. No push or deployment. No changes in `../sites/` or the root assembly helpers. A full assembly regenerates `/tools/`; preserve its new Contact nav link when reconciling the hub generator before a later release.
