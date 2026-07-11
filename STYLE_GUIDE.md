# ProtectMyPhoto Visual Style Guide

## Product Feel

ProtectMyPhoto should feel like a premium browser darkroom: calm, trustworthy, technical enough to be credible, and simple enough for mobile form users.

## Color Tokens

- Charcoal ink: `#201816` for primary text and strong controls.
- Warm paper: `#fffaf3` and `#fbfaf7` for the page and cards.
- Amber highlight: `#f5a524` for measured attention, badges, and progress details.
- Emerald trust: `#0f9f6e` for privacy and success states.
- Orange CTA: `#f65a1f` for the strongest action only.
- Lines: `#e8ddd0` and `#d8c8b8` for soft separation.

Avoid bright random colors. Tool cards should share the same visual language and use icon shapes, labels, and illustrations for differentiation.

## Type

- Body stack: `IBM Plex Sans`, `Inter`, `Manrope`, system sans.
- Display stack: `Fraunces`, `Georgia`, serif fallback for occasional editorial accents.
- Headings should be confident, not oversized on mobile.
- Body copy should stay direct and specific.

## Spacing

Use an 8px rhythm:

- `8px`: tight inline gaps.
- `16px`: card inner gaps and small vertical spacing.
- `24px`: standard card padding.
- `32px`: section component spacing.
- `48px`: major mobile section spacing.
- `72px+`: desktop hero and major section spacing.

## Radius And Shadows

- Inputs/buttons: `16px`.
- Cards: `20px`.
- Large panels: `24px`.
- Soft lift only on hover; avoid heavy dark shadows.

## Motion

- Use `160ms-220ms` transitions for hover and focus.
- Movement should be small: `translateY(-2px)` to `translateY(-6px)`.
- Respect `prefers-reduced-motion`.

## Interaction Rules

- The hero upload/compress action is the primary first interaction.
- Tools must be usable without login.
- All processing copy should reinforce local browser-side privacy.
- Do not show fake user counts or unsupported claims.

