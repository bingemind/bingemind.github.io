# Bingemind

Website for [Bingemind](https://bingemind.com/), an AI automation agency, plus a set of free browser tools.

Every tool is a single-purpose page that runs fully in the browser. No sign-up, no limits, nothing is uploaded.

- Tools hub: https://bingemind.com/tools/
- Made by [Abhishek Mishra](https://bingemind.com/abhishek-mishra/), SDE @ Oqu AI

## Free tools

### Kitchen and baking

| Tool | What it does | Link |
|---|---|---|
| Cake pan size converter | 8 inch to 9 inch round is 1.27x. Convert any cake pan: round, square, 9x13, loaf, bundt. Get scaled ingredients and a bake time guide. | https://bingemind.com/cake-pan-converter/ |
| Sourdough starter feeding calculator | Free sourdough starter feeding calculator. Get grams of starter, flour and water for 1:1:1, 1:5:5 or any ratio, plus a rough peak time. | https://bingemind.com/sourdough-starter-calculator/ |

### Gym and running

| Tool | What it does | Link |
|---|---|---|
| Barbell plate calculator | Enter a target weight and see the plates to load on each side of the barbell. lb and kg, any bar, your plates, warm-up sets. | https://bingemind.com/barbell-plate-calculator/ |
| Warm up set calculator | Enter your work weight. Get warm up sets from the empty bar, rounded to plates you can load, with plates per side. lb and kg, print view. | https://bingemind.com/warm-up-set-calculator/ |
| Percent of 1RM calculator | Enter your 1RM and get 50% to 100% as loadable weights with plates per side. lb and kg. Also finds the percent of any weight, plus rep max estimates. | https://bingemind.com/percent-of-1rm/ |
| 5/3/1 program calculator | Enter your lifts and get the full 4-week 5/3/1 cycle: sets, reps, weights rounded to your plates, BBB, FSL, SSL, jokers, deload and a print sheet. | https://bingemind.com/531-program-calculator/ |
| GZCLP calculator | Free GZCLP calculator. Enter your weights, see today's T1, T2 and T3 sets, plates per side, and the next session after a pass or a fail. | https://bingemind.com/gzclp-calculator/ |
| RPE chart and calculator | Editable RPE chart with RIR. Enter weight, reps and RPE to get your estimated 1RM and the weight for any other reps and RPE, rounded to plates. | https://bingemind.com/rpe-chart/ |
| Treadmill pace converter | Turn treadmill speed into pace and pace into speed. mph, km/h, min/mile, min/km, incline-adjusted flat pace, and 5K to marathon times. | https://bingemind.com/treadmill-pace-converter/ |
| Track split calculator | Turn a goal time into 400 m, 300 m or 200 m lap splits. Even or negative split, lap time to finish time, interval builder and a printable pace band. | https://bingemind.com/track-split-calculator/ |

### Home and trades

| Tool | What it does | Link |
|---|---|---|
| Board and Batten Calculator | Free board and batten spacing calculator. Get the exact gap, a mark for every batten, a to-scale drawing and the boards to buy. | https://bingemind.com/board-and-batten-calculator/ |
| Rolling Offset Calculator | Free rolling offset calculator for pipe and EMT conduit. Get true offset, travel, run, shrink and cut length to 1/16 inch. No sign-up. | https://bingemind.com/rolling-offset-calculator/ |
| Rebar weight calculator | Free rebar weight calculator. Enter bar size, length and quantity to get total lb, kg and tons. ASTM A615 weights, metric bars, copy or print the list. | https://bingemind.com/rebar-weight-calculator/ |

### Crafts and print

| Tool | What it does | Link |
|---|---|---|
| Knitting increase evenly calculator | Increase or decrease evenly across a row, for knitting or crochet. Enter your stitches and how many to add or remove. Get the exact pattern line, flat or in the round, plus a picture of your row. | https://bingemind.com/knitting-increase-calculator/ |
| Print a poster on multiple pages | Split any image into a multi-page PDF poster. Free, no watermark, no sign-up. Your picture never leaves your device. | https://bingemind.com/poster-tiler/ |
| Change image DPI to 300 | Change the DPI of a JPEG or PNG to 300, 150, 72 or any value. Pixels stay untouched. Runs in your browser, so your images never leave your device. | https://bingemind.com/dpi-changer/ |

### Work and data

| Tool | What it does | Link |
|---|---|---|
| Markdown to PDF | Convert Markdown to PDF free in your browser. Live preview, tables, code highlighting, themes, Letter or A4. No upload, no watermark, no limit. | https://bingemind.com/markdown-to-pdf/ |
| Convert a column to a comma separated list | Paste a column from Excel, Sheets or SQL and get a comma separated list at once. Add quotes, remove duplicates, sort. Free, private, no sign-up. | https://bingemind.com/column-to-comma/ |
| Count the drawer calculator | Count your cash drawer at shift end. Enter bills, coins and rolls, set your float, and see the deposit and which bills to pull. Free and private. | https://bingemind.com/cash-drawer-counter/ |

## How this repo works

- `main` deploys to https://bingemind.com through GitHub Pages (custom domain in `CNAME`).
- `index.html` is the agency home page. `privacy/` and `abhishek-mishra/` are site pages.
- Each tool lives in its own folder (`/<tool>/`). These folders are build output. The source for each tool is kept in a separate repo and built with `npm run build:bingemind`, then copied here.
- `tools/index.html` is the hub page. `robots.txt` lists every tool sitemap. `.nojekyll` stops GitHub Pages from hiding the `_astro/` asset folders.

Do not edit tool folders by hand. Rebuild them from source instead.
