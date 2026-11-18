# Development and deployment workflow

This repository is the only source for the publication. Juncture renders it
directly from GitHub, so there is no build step and no separate staging
repository.

- Repository: `mattering-press/Hear-Here-Spatial-Practices`
- Production branch: `main`
- Production site: `https://juncture-digital.org/mattering-press/Hear-Here-Spatial-Practices`
- Branch preview: add `?ref=<branch>` to any page URL (see below)

## How it fits together

```text
Local feature branch
    | git push origin <branch>
    v
Feature branch on GitHub  ->  Juncture branch preview (?ref=<branch>)
    |
    | review the preview, then merge a pull request
    v
main on GitHub  ->  production site
```

`main` is always the published version. Every change reaches it through a pull
request from a feature branch, and the commit that was previewed is the commit
that is merged.

## Starting a piece of work

Branch from the latest `main`:

```sh
git switch main
git pull --ff-only origin main
git switch -c <feature-branch>
```

Use a branch name without `/` (for example `walk-page`, not `jules/walk-page`).
Juncture splits the GitHub URL on slashes to find the branch, so a name with a
slash cannot be previewed. If a tool creates a branch with a slash, push it
under a flat name instead: `git push -u origin HEAD:<flat-name>`.

Longer-running work, such as the collage index on `collage-index`, lives on its
own branch and usually in its own worktree. Bring in changes from `main` with a
merge (not a rebase, because the branch is already pushed):

```sh
git fetch origin
git merge origin/main
```

## Previewing a branch

1. Commit on the feature branch and push it: `git push origin <branch>`.
2. Open the page you changed with `?ref=<branch>`:

   ```text
   https://juncture-digital.org/mattering-press/Hear-Here-Spatial-Practices/?ref=<branch>
   https://juncture-digital.org/mattering-press/Hear-Here-Spatial-Practices/essays/walk.md?ref=<branch>
   ```

3. Check it on desktop and on a phone. Internal links keep `?ref=<branch>`, so
   reviewers can click around and stay on the branch.
4. If a change to `custom.css`, `custom.js` or a page does not show up, add
   `&refresh=true` to the URL. Juncture caches the files it fetches from GitHub.

What a preview uses from the branch:

- the Markdown pages, and `custom.css` and `custom.js`;
- Markdown images (`![](/media/…)`), Markdown links and other relative `src` and
  `href` values, which Juncture rewrites to the branch.

What it always takes from `main`:

- `.ve-media gh:…` images and `.ve-header` backgrounds, because the `gh:` syntax
  has no branch;
- the direct-image fallback in `custom.js` and the hard-coded audio URLs;
- any URL built in custom JavaScript that does not use `window.REF`.

So a new image file referenced with `gh:` only appears once it is on `main`.
Reference it as a Markdown image while previewing, or accept the gap and check
it after merging.

A preview URL is public, like the branch itself on GitHub. Do not push anything
that should not be seen.

## Publishing to production

1. Preview the pushed branch as above.
2. Open a pull request from the feature branch to `main`.
3. Merge it once the preview has been approved.
4. Check the production URL after the merge. Add `?refresh=true` once if the old
   version is still showing.
5. Delete the feature branch on GitHub and locally.

Never push directly to `main`, and never copy files into `main` by hand. The
pull request is the record of what was published.

## Checking the renderer locally

A generic static-file server does not reproduce Juncture's Markdown rendering,
URL rewriting or asset handling, so it is not a sufficient check. The branch
preview is the reference. Juncture's renderer (`serve.py` in
`juncture-digital/juncture`) can be run locally to test without pushing, but its
local mode does not resolve this repository's paths on its own; it needs a small
wrapper that sets the owner, repository and branch.

The Juncture compatibility rules in `AGENTS.md` apply to every change.
