# Security Policy

## What happened here

A Supabase project URL and anon key were committed to this public repository
in `.env` on the `main` branch. The file has been deleted from `main`, and
this branch adds `.env` to `.gitignore` so it cannot be committed again.

**Deleting the file from the code does NOT fix the leak.** The key is still
in the repository's git history and must be treated as compromised.

## Required action (owner only)

1. **Rotate the Supabase anon key** in the Supabase dashboard
   (Project Settings → API → rotate/generate a new anon key).
2. Update your local `.env` with the new key. Do not commit `.env`.
3. Review the project's Row Level Security policies: the anon key is
   low-privilege by design, but it is only safe if RLS policies actually
   restrict what anonymous clients can read and write.

## Rules for contributors

- **Never commit credentials** — not `.env`, not in source, docs, or
  tests. `.env` is gitignored in this repo; `.env.example` documents the
  variable names with placeholder values.
- Keep secrets in a local `.env` file. Copy `.env.example` to `.env` and
  fill in your own values.
- If you find a secret in the repo, do not post it anywhere. Remove it,
  open a security fix, and tell the maintainer so the credential can be
  rotated. Assume any committed secret is already compromised.
- To report a vulnerability, contact the maintainer directly. Do not
  include the secret itself in the report.
