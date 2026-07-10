# Security Notes

The public email address `admin@protectmyphoto.in` can be displayed in pages and support references.

Never commit or publish:

- SMTP credentials
- Firebase private keys
- Firebase service account files
- Admin-only API keys
- Database passwords
- Hosting control panel credentials

Firebase web app config may be public, but security must rely on Firebase rules and allowed domains, not secrecy of frontend config.
