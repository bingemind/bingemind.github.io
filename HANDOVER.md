# Bingemind static site handover

## 2026-11-12: AdSense fixes, local only
- Implemented the approved brief at `../briefs/adsense-fixes-2026-11-12.md`. New indexable pages: `/about/`, `/contact/`, `/terms/`, `/services/`. Home now leads with eight tools. The agency visual, form and copy live on `/services/`. Former home anchors still resolve to the business-services section.
- All 401 HTML pages include site links, Cookie settings and a deferred consent script. Analytics loads only after acceptance on the live host. Advertising remains denied by default and needs Google's separate consent message. Existing AdSense loaders and all 393 tool main bodies are unchanged. Galactic pages retain their no-analytics setting.
- Release step: run node scripts/site-footer.mjs after copying tool builds
- Checks: `node scripts/check-consent.mjs` passes 10 isolated logic checks; `python3 scripts/check-site.py` passes links, metadata, preservation and repeat-run checks. The preservation check compares with the preceding commit when this handover is the current HEAD. No packages needed.
- Independent static review completed. Four findings fixed and rechecked. HTTP preview, browser interaction, phone overflow, tap measurements and desktop/phone screenshots remain blocked by this session's sandbox. No screenshot exists yet. Do not release before those checks and the owner's home-page preview.
- Report: `../briefs/adsense-fixes-2026-11-12-REPORT.md`. No push or deployment. No changes in `../sites/` or the root assembly helpers. A full assembly regenerates `/tools/`; preserve its new Contact nav link when reconciling the hub generator before a later release.
