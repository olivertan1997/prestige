# UAT - Prestige Interior Design

This folder holds the user acceptance testing (UAT) for the live website, https://prestige-interior.olivertan1997.workers.dev.

| File | What it is |
| --- | --- |
| `prestige-uat-v2.html` | **The UAT checklist (round v2 edition).** It retests B-05, the only test that failed in v1, and shows each test's v1 result. It uses fresh `uat2` test accounts, because the v1 ones still exist. |
| `test-plan.md` | The checklist's 56 test cases as a readable document, with blank result boxes, for printing or submission |
| `test-cases.csv` | The same test cases, for Excel or Google Sheets |
| `runs/` | One folder per UAT round: `v1`, `v2`, ... The history is in [runs/README.md](runs/README.md) |

## Doing a UAT round

1. Double-click `prestige-uat-v2.html` to open it in Chrome or Edge, and type your name in the **UAT round** box.
2. Choose **Failed in v1 (retest)** and run B-05 first (it needs A-02). Then work through modules A to F on the live website. Mark each test **Pass**, **Fail** or **Blocked** and add notes.
3. Your results are kept in that browser as you go, so reloading the page is safe. Use the same browser until you finish.
4. When the round is finished, click **Download results (CSV)**.
5. Save the round as a new version:
   ```powershell
   npm run uat:save -- "C:\Users\<you>\Downloads\prestige-uat-v2-results-2026-11-09.csv"
   ```
   This creates `runs/v2/` and updates the history table in `runs/README.md`. The new folder contains:
   - `results.csv`, the file you downloaded
   - `summary.md`, with the pass rate, failed and blocked tests, and requirement coverage
   - `run.json`
6. Commit and push it:
   ```powershell
   git add uat
   git commit -m "UAT round v2"
   git push
   ```

Saved versions are never overwritten. Saving `v2` a second time is refused unless you add `--force`.

## Changing the test cases

1. For a new round, copy the newest checklist to `prestige-uat-v3.html`, change `THIS_ROUND`, and edit the `CASES` list in the copy.
2. Run `npm run uat:plan` to regenerate `test-plan.md` and `test-cases.csv`. It always reads the newest `prestige-uat-vN.html`.
3. `npm run uat:save` checks each round against the newest edition numbered at or below that round.
