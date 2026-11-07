# Agent instructions

- For browser-based work, use a separate test Chromium instance controlled with Playwright. The user's main browser may be used for previews when the user explicitly authorizes it.
- Follow the development and deployment workflow in `DEVELOPMENT.md`.
- Treat the production repository as the canonical source of history. Make changes on a feature branch locally, publish that branch to the staging repository's `main` branch for Juncture testing, and promote reviewed changes to the production repository's `main` branch through a pull request.
- Do not make source edits directly in the staging repository. Do not push a development branch directly to production `main`.
