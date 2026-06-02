# Security Notes

- The previously tracked Firebase service account must be treated as compromised because it existed in repository history.
- Rotate the credential outside the repository and replace it through the deployment secret manager instead of a committed JSON file.
- Never commit service account files, private keys, production `.env` files, or exported credentials to Git.
- Keep `.env.example` as the only committed environment template.
