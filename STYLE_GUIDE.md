# ProtectMyPhoto Visual Style Guide

## Product Feel

ProtectMyPhoto should feel light, soft, warm, trustworthy, and professional. The product is a privacy-first browser toolkit, so the interface should feel calm and easy to use rather than dramatic, dark, or overly decorative.

## Color Tokens

- Page background: `#FFF9F4`
- Alternate background: `#FFF4EA`
- Card surface: `#FFFFFF`
- Soft surface: `#FDF0E6`
- Muted surface: `#F7F1EB`
- Input surface: `#FFFCF9`
- Heading text: `#211D1A`
- Primary text: `#2D2926`
- Secondary text: `#665E58`
- Muted text: `#81766F`
- Primary action: `#C95F45`
- Primary action hover: `#AD4B34`
- Primary soft background: `#FBE5DE`
- Secondary trust accent: `#357C78`
- Secondary trust hover: `#286561`
- Secondary soft background: `#E3F1EF`
- Gold accent: `#C6903F`
- Success: `#2F7D5A`
- Warning: `#A66A20`
- Error: `#B7463C`
- Info: `#39748F`
- Soft border: `#E8DCD2`
- Strong border: `#D8C6B8`
- Focus ring: `rgba(201,95,69,.25)`

Avoid pure black backgrounds, faded low-contrast text, bright random colors, and saturated neon effects. Use orange only for the strongest action on a screen.

## Type

- Body stack: `IBM Plex Sans`, `Inter`, `Manrope`, system sans.
- Display stack: `Fraunces`, `Georgia`, serif fallback for editorial headlines.
- H1s should feel premium and readable, with mobile-safe sizing.
- Body copy should be clear, helpful, and human.

## Spacing

Use an 8px rhythm:

- `8px`: tight inline gaps.
- `16px`: compact groups.
- `24px`: card padding and standard component gaps.
- `32px`: page section spacing.
- `48px`: mobile major spacing.
- `72px+`: desktop hero and major layout spacing.

## Radius And Shadows

- Inputs/buttons: `10px` to `12px`.
- Cards: `16px` to `20px`.
- Large panels: `20px` to `24px`.
- Standard card shadow: `0 8px 28px rgba(83,57,42,.08)`.
- Floating shadow: `0 14px 40px rgba(83,57,42,.12)`.

Shadows must be warm and subtle. Avoid heavy black shadows.

## Motion

- Use `160ms-220ms` transitions for hover and focus.
- Movement should be small: `translateY(-2px)` to `translateY(-6px)`.
- Always respect `prefers-reduced-motion`.

## Components

- Navigation should be warm, readable, and consistent on every route.
- Cards should use white or warm-paper surfaces with clear borders.
- Tool pages should prioritize preview visibility and clear controls.
- Inputs must have visible labels, readable placeholder color, and an obvious focus state.
- Disabled buttons must remain readable.
- Footer links should reflect auth state when available.

## Interaction Rules

- Tools must remain usable without login.
- User images should stay local unless a feature explicitly requires an API and clearly says so.
- All privacy copy should be specific and truthful.
- Do not show fake user counts or unsupported claims.
