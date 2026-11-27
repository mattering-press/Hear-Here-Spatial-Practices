# Contributing to everytrickinthebook

everytrickinthebook is made by small presses for small presses. You are welcome to use it for your own books, to
adapt it, and to send improvements and new parts back so that every press using it gets them.

## What is shared and what is yours

- **Shared:** what the toolkit does: the build, the filters, the scripts, the template and the default style.
  Improvements to these come back to everyone, under the toolkit's licence (AGPL-3.0-or-later, see `NOTICE.md`).
- **Yours:** your books, your configuration and your press's look. Keep styling in files of your own rather than
  in the toolkit's files; the licence does not reach them (see "Additional terms for the toolkit" in `NOTICE.md`).

The rules that keep a shared change from breaking anyone's book (paragraph numbers, versions, the data the build
writes) are in `CONTRACT.md`.

## Sending a change

1. Get in touch first for anything larger than a fix, so that we can agree where it belongs: open an issue at
   https://github.com/everytrick/everytrickinthebook.
2. Make the change on a branch and open a pull request. Add an entry to `CHANGELOG.md` and bump the version, as
   "Versions of the book and of everytrick" in `DEVELOPMENT.md` describes.
3. Sign off every commit (`git commit -s`), which adds a line such as
   `Signed-off-by: Your Name <you@example.org>`.

## What the sign-off means

There is no contributor agreement. You keep the copyright of what you contribute. With the sign-off you confirm
the Developer Certificate of Origin 1.1 (https://developercertificate.org/): that the contribution is yours, or
that you have the right to send it, and that it may be shared under the toolkit's licence. Documentation and
conventions are contributed under CC BY-SA 4.0.

Because every contributor keeps their rights, nobody can later take the toolkit out of the commons, its founder
included.

## Credit

Everyone whose contribution is merged is named in `CONTRIBUTORS.md` and on https://everytrick.org/, with what they
made. A new part of the toolkit names its makers in the comment at the top of its files and in its `CHANGELOG.md`
entry. Add yourself to `CONTRIBUTORS.md` in your pull request, as you wish to be named.

## Who decides

Studio Julien McHardy (SJMcH) maintains everytrickinthebook and decides what enters it. The aim is one toolkit
that every press can configure, rather than many diverging copies.
