# ProtectMyPhoto Audit Fix Report

Date: 2026-07-22
Project: protectmyphoto.in

## Summary

This pass focused on the remaining audit items and a real local browser QA run for the static Hostinger build. The main functional issue found in the clean Git deploy was that `js/firebase-config.js` was ignored by Git. That made Firebase Auth, account status, and reviews depend on a manually uploaded file, which is fragile for Hostinger Git deployments.

## Fixed In This Pass

### Firebase config deploy stability

- Added `js/firebase-config.js` to the repository with the Firebase Web App config.
- Removed `js/firebase-config.js` from `.gitignore`.
- Updated Firebase setup docs to clarify that Firebase Web App config is public browser routing data, not an admin secret.
- Private keys, service-account JSON, SMTP credentials, Hugging Face keys, and server tokens remain forbidden from frontend code.

### Background-removal error safety

- Removed frontend dependency on raw provider error text.
- Stopped returning low-level cURL provider errors to the browser.
- Provider/cURL details are logged server-side only.
- User-facing errors remain short, safe, and retry-focused.

## Previously Completed Audit Items Confirmed

- Firestore reviews now use `pending` status on create instead of client-approved public reviews.
- Review daily guard uses deterministic document IDs for signed-in users and guests.
- Background-removal PHP endpoint has same-origin checks and per-IP rate limiting.
- `.env` and `api/.env` are blocked by `.htaccess`.
- CSS cache-busting is consistent across HTML pages.
- Skip-to-content links are present.
- `main-content` targets are present.
- Tool search has an accessible label.
- Images have lazy-loading coverage where applicable.

## Local Browser Tool QA

Tested with local static server and headless Chrome using generated PNG/JPG sample images.

| Tool | Upload | Process | Download | Console errors |
|---|---:|---:|---:|---:|
| Compress Image | Pass | Pass | Pass | 0 |
| Resize Image | Pass | Pass | Pass | 0 |
| Convert Image | Pass | Pass | Pass | 0 |
| Remove Metadata | Pass | Pass | Pass | 0 |
| Image to PDF | Pass | Pass | Pass | 0 |
| Crop Image | Pass | Pass | Pass | 0 |
| Rotate Image | Pass | Pass | Pass | 0 |
| Signature Resizer | Pass | Pass | Pass | 0 |
| Passport Photo Maker | Pass | Pass | Pass | 0 |
| White Background Photo | Pass | Pass | Pass | 0 |
| Reviews Page | Form present | Firebase module loads | N/A | 0 |
| Custom Stamp Maker | Page loads | Canvas present | N/A | 0 |

Image-to-PDF verification: downloaded PDF starts with `%PDF-` and contains an embedded image object (`/Subtype /Image`), so the earlier blank-PDF class of bug is covered by this test.

Crop verification: draggable crop box exists after upload, and crop output downloads successfully.

## Static Verification

- JavaScript syntax check passed for all files in `js/`.
- 27 HTML pages checked.
- All checked pages use `css/styles.css?v=15`.
- All checked pages include a skip link.
- All checked pages include `main id="main-content"`.

## Not Verified Locally

- PHP syntax lint could not be run because PHP is not installed on this Windows machine.
- Hugging Face background-removal endpoint was not called during automated QA to avoid consuming API quota.
- Firestore security rules must still be published manually from Firebase Console after Git changes.

## Manual Deployment Checks

1. Redeploy Hostinger from GitHub `main`.
2. Publish the latest `firestore.rules` in Firebase Console.
3. Confirm `https://protectmyphoto.in/js/firebase-config.js` returns the config file.
4. Confirm `https://protectmyphoto.in/api/.env` returns 403 or 404.
5. Test one review submit after rules are published; it should appear in Firestore as `pending`.
6. Manually approve the review by changing `status` to `approved`; it should then show on the site.
7. Test AI background removal once on live hosting because it depends on Hostinger PHP, cURL, and `api/.env`.

## Current Launch Status

The static browser-side toolset is passing local QA. The remaining launch-critical manual items are Firebase rules publish and one live Hostinger API test for AI background removal.
