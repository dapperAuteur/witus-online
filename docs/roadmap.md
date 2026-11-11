---
app: witus-online
name: WitUS
stage: live
url: https://www.witus.online
updated: 2026-11-10
---

# Roadmap

witus.online is the ecosystem hub: the public site and app directory, the WitUS Accounts sign-in
(accounts.witus.online), and the owner admin that watches every other app. This file is read by the
admin roadmap page, so it keeps the shared five-section format.

## Live now
- Public site with the ecosystem app directory and the public roadmap
- WitUS Accounts: "Sign in with WitUS" for the ecosystem apps, account and devices pages
- Owner admin: operator tasks from every repo, production deploys, unmerged branches, roadmap, library, episodes, invitations
- Owner admin: vendor costs with a daily snapshot, cost cleanup, Claude Code usage and mistake cost
- Migrate-on-merge workflows for the app and identity databases

## In progress
- DORA metrics page (`/admin/dora`): deploy frequency, lead time (authoring and merge wait), change fail rate, recovery time, rework rate and credits per change, per app and ecosystem-wide over 30 and 90 days, plus the hourly failed-deploy alarm email (branch `feat/dora-metrics`, task 159)

## Next
- Run button for every app's post-deploy workflows on the admin (post-deploy automation rule)

## Backlog
- Record each Claude response's working directory in the usage archive, so helper work is charged to the repo it changed instead of the coordination line

## Blocked on
- Actions: Read-only on the roadmap token, for post-deploy workflow data on the DORA page (task 159)
