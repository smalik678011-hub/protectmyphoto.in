# ProtectMyPhoto launch checklist

## Before upload

- Keep image tools usable without login.
- Keep the preview server files local only:
  - start-preview.bat
  - start-preview.ps1
  - .local-preview-server.js
- Do not upload `.git`, `.agents`, or `_git_push_work_*`.
- Do not upload Firebase private keys, service account files, SMTP passwords, or admin credentials.

## Firebase Auth

- Google provider enabled.
- Email/Password provider enabled if email signup is required.
- Authorized domains:
  - protectmyphoto.in
  - www.protectmyphoto.in
  - localhost for local testing only

## Hostinger static upload

Upload the public site files and folders:

- HTML files
- css/
- js/
- favicon.svg
- robots.txt
- sitemap.xml
- site.webmanifest
- vendor/README.md if needed for attribution

The local `js/firebase-config.js` is intentionally ignored by Git. If Firebase login is used on production, add the production Firebase Web App config during deployment. Never add admin/private Firebase credentials.

## Final checks

- Homepage opens.
- Tools page opens.
- Each tool accepts valid images and rejects invalid files.
- Tool pages included:
  - Compress Image
  - Resize Image
  - Convert Image
  - Remove Metadata
  - Image to PDF
  - Passport Photo Maker
  - Crop Image
  - Rotate Image
  - Signature Resizer
  - White Background Photo Maker
  - Custom Stamp Maker
- Google login works.
- Sign out works.
- Contact email shows `admin@protectmyphoto.in`.
