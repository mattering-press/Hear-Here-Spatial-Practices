# Open editorial decisions

The questions about the book's content that are still open, kept here so that they can be sent in bundles and
settled together. Update this file in the same branch as the change that raises or settles a question. This repository
is public: no contact details, permission letters or private correspondence here, only the questions and their
answers.

How to use it:

- **Bundles** are what goes to one person at one time. When a bundle is sent, write the date beside it; when it is
  answered, move each answered question to "Settled" with the answer and the date, and make the change on a branch.
- Each question has a number that is never reused (E1, E2 …), so that an email or a pull request can refer to it.
- **Default** is what the book does until the question is settled. Nothing on a public page says that something is
  open.
- **Status to check** marks a question whose state was not known when this file was started (28 November 2026).

## Bundle A: films and Global Ecologies

For Nirmal Puwar. Drafted 27 November 2026 (email in the publisher's hands); not yet sent.

| | Question | Where | Default until answered |
|---|---|---|---|
| E1 | A caption for each new film, one line saying what it shows | Bharti Parmar films 1 and 2, Monica Brown films 1 and 3, Duke Keats's performance (Acorn), the Seeds of Vandana Shiva panel | Drafts from the Vimeo titles ("Bharti Parmar, film 1") |
| E2 | The credit for every film by Mindriot Productions: "Film: Jon Randle, Mindriot Productions", as for Acorn? | The six new films and the two Absence/Presence films (items 67, 68) | No credit shown |
| E3 | The wording for three films on Bharti Parmar's page, which says "A film with Bharti in the cathedral further supports the podcast discussion." | `essays/bharti_parmar.md` | The sentence as it is |
| E4 | The authors of the Seeds of Vandana Shiva page: the panel and Nirmal Puwar, as for Acorn's speakers, and the spelling of their names (Georges Félix, Emellyne Forman, Marc Hammon, Greg Muldoon, Lopamudra Patnaik Saxena) | `essays/seeds_of_vandana_shiva.md`, front matter (marked TBC there) | As drafted; citations use them |
| E5 | The other two Global Ecologies events: films, dates, places, speakers, descriptions, organisers | New event pages, one each | Not in the book |
| E6 | A line introducing the Global Ecologies series on the Events page | `essays/events.md` | No line |
| E7 | The documentary's year: Nirmal Puwar's description says 2022; listings give a first showing in November 2021 | Seeds of Vandana Shiva page and the bibliography (`becket2022`) | 2022 |

E1 and E2 can be answered in the editing view, which lists every item with fields for its caption and credit, and
"Hand over changes" to send them back: <https://seeds-page.hearhere-preview.pages.dev/media-index/edit/> (the preview
with the six new films). The rest by email. See "Plan: Nirmal Puwar's films and Global Ecologies" in `DEVELOPMENT.md`.

## Bundle B: pictures, captions, credits and rights

For Nirmal Puwar, through the editing view. Status to check: an earlier round on captions and alt text was prepared
on the branch `captions-alt-text` (23 November 2026), whose editing view is kept until the author has replied:
<https://captions-alt-text.hearhere-preview.pages.dev/media-index/edit/>. It predates the new films; the one for
Bundle A has them.

| | Question | Where | Default until answered |
|---|---|---|---|
| E8 | Captions and alt text of the pictures | Every page, through the editing view | As they are |
| E9 | Who took which photograph of the walk and of Acorn; they are not told apart yet | `essays/walk.md`, `essays/acorn.md`, their credits lists | The photographers are named in the pages' credits lists |
| E10 | Rights for the items whose rights are not yet known (most of them) | `media/register.csv`, `rights` | Nothing shown |
| E11 | Alt text for the cards' pictures on the home page and the Events page, which have none | `README.md`, `essays/events.md` | None (the build warns) |

## Bundle C: podcast transcripts

For Nirmal Puwar. Status to check: an email asking her to confirm 24 corrections found while timing the transcripts
was drafted on 22 November 2026.

| | Question | Where | Default until answered |
|---|---|---|---|
| E12 | The 24 transcript corrections | The podcast pages | Corrected as proposed |

## Bundle D: the publisher's decisions

For the publisher (Mattering Press).

| | Question | Where | Default until answered |
|---|---|---|---|
| E13 | Transcripts of the films (whisper drafts, edited; shown beside the film and in full on its item page): whether, who edits them, and the speakers' agreement | Every film | No transcripts |
| E14 | Several routes through the book: confirm the plan once the new chapters' materials are known, and its four open questions | "Plan, not yet confirmed: several routes through a book" in `DEVELOPMENT.md` | One table of contents |
| E15 | The press's thanks in the Colophon ("We would like to thank" is unfinished) and the author's Acknowledgements | `about.md`, `about/acknowledgements.md` | Not shown |
| E16 | The book's title on the press's catalogue page, "Here Here: Spatial Practices", and its link to the new address | matteringpress.org/books/herehere | As it is |
| E17 | When to freeze the review version for the second peer review (`v0.9-review2`) | `versions.json` | Not frozen |

## Settled

Answered questions, newest first, with the answer and its date.

- **Places for the new films** (27 November 2026, Nirmal Puwar): Bharti Parmar's films on her page, Monica Brown's on
  hers, Duke Keats's on the Acorn page; the Seeds of Vandana Shiva talk is a Global Ecologies event.
- **Global Ecologies pages** (27 November 2026, the publisher): one page per event; the Events cards in order of date.
- **The Seeds of Vandana Shiva panel** (28 November 2026, the publisher): named in the page's credits, with their
  affiliations, not in its text.
