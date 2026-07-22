# Firebase Auth setup

ProtectMyPhoto can use Firebase Authentication on static Hostinger hosting. No Node.js server is required for this MVP.

## What to enable

1. Create a Firebase project.
2. Open Authentication.
3. Enable Email/Password provider.
4. Enable Google provider if you want Google sign in.
5. Add the same public support email in the Google provider settings.
6. Enable email verification.
7. Add authorized domains:
   - protectmyphoto.in
   - www.protectmyphoto.in
   - localhost, only for local testing

## Frontend config

The production config file is:

```text
js/firebase-config.js
```

The example file is still available for reference:

```text
js/firebase-config.example.js
```

Firebase Web App config is public routing data. It is not an admin secret, so the production browser config can be deployed with the static site. Only Firebase Web App config values belong here.

## Never add these to frontend

- Firebase service account JSON
- private keys
- SMTP passwords
- admin SDK credentials
- database admin tokens

## Disposable email blocking

The login page blocks common temporary email domains before signup. This is helpful for MVP abuse reduction, but it is not a replacement for server-side abuse controls.

## Privacy rule

Authentication must not change the core product promise: image and document tools should keep processing files in the browser unless a future feature clearly asks the user for upload/storage permission.
