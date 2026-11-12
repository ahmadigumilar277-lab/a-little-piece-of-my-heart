# A Little Piece of My Heart

A romantic, responsive website with a private mobile-friendly content dashboard. The public website remains static HTML, CSS, and vanilla JavaScript; Supabase provides remote content, authentication, and media storage. There is no service-role key or private credential in the browser.

## Project map

- `index.html`, `css/`, `js/` — public romantic website.
- `admin/` — private owner dashboard at `/admin`.
- `api/config.js` — Vercel function returning only the public Supabase URL and anon/publishable key.
- `supabase/setup.sql` — database, RLS, seed content, storage bucket, and storage policies.
- `vercel.json` — direct `/admin` route and security response headers.
- `.env.example` — names of the Vercel environment variables (contains no real credentials).

## Set up Supabase

1. Create a Supabase project.
2. In **Authentication → Users**, create the owner's account using an email and password. Do not expose a sign-up link on the website.
3. Open the owner's user record and copy its UUID.
4. Open `supabase/setup.sql`. Replace every `OWNER_USER_UUID` placeholder with that exact UUID, then run the whole script in **SQL Editor**.
5. In **Authentication → Providers / Sign in**, leave email/password sign-in enabled and disable public signups (the setting may appear as **Allow new users to sign up**). The dashboard intentionally has login only and no registration flow.
6. In **Project Settings → API**, copy the Project URL and the `anon`/publishable key. Never copy or configure the `service_role` key for this website.

The SQL script seeds editable example content and makes the `site-media` bucket public-read so published memories, music, and the video message can play without a visitor login. Only the exact owner UUID can write site content or upload, replace, and remove bucket files. Do not use this public bucket for private or sensitive files.

## Deploy to Vercel

1. Push the `A-Little-Piece-of-My-Heart` project folder to a GitHub repository.
2. In Vercel, choose **Add New → Project**, connect GitHub, and import that repository. Set the project **Root Directory** to `A-Little-Piece-of-My-Heart` if the site is inside a parent repository; otherwise use the repository root.
3. This is a static site plus a Vercel function. No framework preset, build command, or output directory is required. Leave the build command empty; the Vercel default static deployment discovers `api/config.js`.
4. In **Project Settings → Environment Variables**, add:
   - `SUPABASE_URL` — the Supabase Project URL.
   - `SUPABASE_ANON_KEY` — the Supabase `anon`/publishable key.
5. Apply the variables to Production (and Preview/Development if desired), then deploy or redeploy.
6. Use the assigned `https://<project-name>.vercel.app` URL. The dashboard is at `https://<project-name>.vercel.app/admin`; direct visits and refreshes are routed by `vercel.json`.
7. Test the public URL and `/admin` after deployment. If Supabase Auth has a Site URL or redirect URL configured, add the Vercel URL there. Email/password sign-in normally stays on `/admin`; do not enable public registration.

For local development with Vercel CLI, copy `.env.example` to `.env.local`, fill in the same two public values, and run `vercel dev` from the project root. Do not commit `.env.local`.

## Use the dashboard

Sign in at `/admin` with the owner email and password created in Supabase Auth. Edit settings and the letter, add and reorder memories/reasons, upload images, music, or an MP4/WebM video message, preview the public site, and save. Video messages appear after a visitor opens the letter. Saved content is fetched by public visitors on their next page load. Uploads are limited to 50 MB and accepted image/audio/video types are checked in the dashboard and by the bucket. After updating an existing project, rerun the updated `supabase/setup.sql` so the existing bucket allows the video MIME types; its seed uses `on conflict do nothing` and will not replace saved content.

## Customize without the CMS

When no Supabase configuration/content is available, the public site uses its built-in fallback data from `js/script.js`. The design and interactions remain available. Once the Supabase setup is complete, edit the content from `/admin`; direct source edits are no longer needed for normal updates.

## Security notes

- The Supabase anon/publishable key is public by design. RLS policies are the security boundary.
- `service_role` keys bypass RLS; never put one in `index.html`, JavaScript, Vercel browser environment variables, or GitHub.
- The SQL policies pin writes to the owner's Auth UUID. If the owner account changes, update the UUID in the policies and seed row using a trusted Supabase SQL Editor session.
- Public visitors can select only published content. Public storage reads are enabled only for the `site-media` bucket.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for a condensed deployment checklist and validation notes.
