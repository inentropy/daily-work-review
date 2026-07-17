# Project workflow

## Default update process

For every feature, fix, UI adjustment, or refactor in this repository:

1. Modify the source only in the local project at `D:\project\daily-work-review`.
2. Run the relevant local checks, including lint, TypeScript, automated tests, and a production build when applicable.
3. Stop after local verification and present the changed behavior, affected files, test results, and review instructions to the user.
4. Keep all changes uncommitted while the user reviews them and provides follow-up feedback.
5. Do not run `git add`, `git commit`, `git push`, create a GitHub pull request, or trigger a Vercel deployment unless the user explicitly says the reviewed version is approved for publishing.
6. After explicit approval, rerun the relevant checks, review the final diff, commit to the intended branch, push to GitHub, and verify the resulting Vercel production deployment.

User review and approval is a required release gate. A successful local build does not authorize publishing.
