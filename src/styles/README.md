# Design tokens

`tokens.css` holds the tokens, `app.css` exposes them to Tailwind. Three layers:

| Layer         | Where                     | Use directly? |
| ------------- | ------------------------- | ------------- |
| **Ramps**     | `--n-0` … `--n-1000`      | No            |
| **Semantics** | `--surface`, `--hover`, … | Yes           |
| **Theme**     | `--color-*` in `app.css`  | Via utilities |

The rule: **a token is named for the job it does**, not for how it looks or for
whichever component needed it first. If no token name describes your case, add
one — do not borrow a token whose name says something else.

## Surfaces — pick by position in the elevation stack

| Token             | For                                         |
| ----------------- | ------------------------------------------- |
| `surface`         | App canvas                                  |
| `surface-sunken`  | Wells: quoted messages, inset panels, chips |
| `surface-chrome`  | Title bar, tab bar, rails, sidebar          |
| `surface-raised`  | Cards, embeds                               |
| `surface-overlay` | Popover, dialog, menu                       |
| `surface-header`  | Label/banner band inside a panel            |
| `surface-media`   | Letterbox behind images/video               |
| `surface-scrim`   | Behind modals, over media                   |
| `surface-inverse` | Flips with the theme (avatar fallback)      |
| `surface-tooltip` | Tooltips — dark in **both** themes          |

## Content — four tiers

`foreground` → `foreground-muted` → `foreground-subtle` → `foreground-faint`.

Plus `foreground-placeholder`, `foreground-link`, `foreground-on-brand`,
`foreground-on-inverse`, `foreground-on-tooltip{,-subtle}`.

## Borders

`border` (default) · `border-subtle` (row dividers) · `border-strong` (form
fields) · `border-focus` · `border-tooltip` · `hairline` (1px ring on avatars
and thumbnails — replaces `ring-black/10 dark:ring-white/10`).

## Interaction — transient vs persistent

`hover` / `hover-strong` / `active` are transient. `selected` /
`selected-strong` / `selected-foreground` are persistent. Keeping them apart is
what lets a hovered row and the current row read differently. Also `indicator`
(active-tab bar, carousel dot), `ring` (focus), `selection` (`::selection`).

## Controls

`field` / `field-hover` / `field-disabled` · `track` / `track-active` ·
`thumb` (knob on a coloured track) / `thumb-inverse` (handle that must contrast
with the page) · `skeleton` · `divider` · `scrollbar{,-hover}` ·
`drop-target{,-border}`.

## Brand and status

`brand` + `-hover` `-active` `-subtle` `-border` `-foreground`.

`danger`, `warning`, `success`, `info` each carry `-subtle` (tinted background),
`-border`, `-foreground` (text on the canvas) and `-on` (text on the solid
fill). `live` is separate from `danger` on purpose: it is a state badge, not an
error, and must not move if `danger` is retuned.

`cat-1` … `cat-8` for prediction/poll series with no good/bad meaning.

Hue anchors (`--hue-brand`, `--hue-warning`, `--hue-success`, `--hue-info`)
retune a whole family in one place.

## Radius

`--radius` (0.625rem) drives the whole `--radius-xs … --radius-3xl` scale.
Previously only `--radius` existed, so `rounded-sm/md/lg/xl` silently fell
through to Tailwind's defaults and the base value affected almost nothing.

## Legacy shadcn names

Semantic tokens read their old shadcn counterpart first:

```css
--surface-sunken: var(--muted, var(--n-100));
```

So a user theme (`src/lib/themes.ts` loads `main.css` unlayered via `<link>`,
which outranks these layers) can still set `--background`, `--muted`, `--card`,
`--popover`, `--sidebar`, `--accent`, `--input`, `--primary`,
`--primary-foreground`, `--muted-foreground`, `--destructive`, `--foreground`,
`--border` or `--ring`. And `app.css` maps `--color-muted` and friends onto the
semantic tokens, so vendored shadcn components (`bg-muted`, `border-input`)
still resolve and `shadcn add` stays usable.

**Do not use the legacy names in new first-party code.**

## What was wrong before

| Symptom                                                                     | Now                        |
| --------------------------------------------------------------------------- | -------------------------- |
| `muted` did 7 jobs: panel, hover, skeleton, header, border, divider, scrim  | one token each             |
| `primary` did 8: indicator, progress fill+track, hover, avatar, thumb, …    | one token each             |
| `input` was both a border colour and a fill                                 | `border-strong` vs `field` |
| `orange-500` hardcoded as the accent in Button/Switch/RadioGroup            | `brand`                    |
| Checked checkbox was black; checked switch was orange                       | both `brand`               |
| Tooltip text was `--primary` — near-black on a dark tooltip in light mode   | `foreground-on-tooltip`    |
| Emote tooltip used fixed `neutral-400`/`white/10` on a surface that flipped | `-on-tooltip` tokens       |
| `--color-text-primary-foreground` in GuestList never existed                | `foreground-on-tooltip`    |
| `secondary`, `card-foreground` defined, zero uses                           | dropped (aliases kept)     |
| Live indicator repeated `text-red-500 dark:text-red-400`                    | `live-foreground`          |
