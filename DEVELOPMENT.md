# Development and deployment workflow

The production repository is the canonical source for this publication:

- Production repository: `mattering-press/Hear-Here-Spatial-Practices`
- Production branch: `main`
- Production preview: `https://juncture-digital.org/mattering-press/Hear-Here-Spatial-Practices`

The staging repository is a separate GitHub repository. Its exact name and URL
should be recorded below after it has been created:

- Staging repository: _to be added_
- Staging branch rendered by Juncture: `main`
- Staging preview: `https://juncture-digital.org/<owner>/<staging-repository>`

## Branch and environment mapping

```text
Local feature branch (for example, Dev-Collage-Branch)
    | push the feature branch normally
    v
Production repository feature branch (backup and pull-request source)
    |
    | publish the same commit to staging/main
    v
Staging repository main -> Juncture staging preview
    |
    | review and test, then merge the pull request
    v
Production repository main -> Juncture production site
```

`main` in the production repository is always the published production version.
`main` in the staging repository is always the version currently under review.
They are separate branches in separate repositories and are not expected to point
to the same commit while development is in progress.

## Local development

Work in a feature branch based on the latest production `main`:

```sh
git switch main
git pull --ff-only origin main
git switch -c <feature-branch>
```

For the current collage work, continue using `Dev-Collage-Branch` rather than
creating another branch.

Run the Juncture development server with this repository as its local content
root. A generic static-file server is not a sufficient final check because it
does not reproduce Juncture's Markdown rendering and asset handling.

## Publishing a feature branch to staging

After the staging remote has been configured as `staging`, publish the currently
checked-out feature branch to the staging repository's `main` branch:

```sh
git push staging HEAD:main
```

This explicit refspec means "send the current local commit to `main` on the
staging repository." Check the current branch and destination before running it:

```sh
git status --short --branch
git remote -v
```

If staging has moved independently, stop and investigate instead of forcing the
push. Staging is a deployment target; source changes must be made in this local
checkout and committed to the feature branch.

## Promoting to production

1. Commit the changes on the local feature branch.
2. Push the feature branch to `origin`.
3. Publish the same commit to `staging/main`.
4. Test the Juncture staging URL on desktop and mobile.
5. Open a pull request from the feature branch to production `main`.
6. Merge only after staging approval.
7. Confirm the production Juncture URL after the merge.

Never promote by copying files manually from the staging repository. The pull
request from the canonical feature branch is the production audit trail.

## Keeping staging current

At the beginning of a new piece of work, update local `main` from production and
then publish the intended feature branch to staging. Do not accumulate unrelated
staging-only commits. Relative asset and navigation URLs are preferred; any
hard-coded `gh:<owner>/<repository>/...` reference should be checked in both
staging and production.
