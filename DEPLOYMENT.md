# Deployment and Supabase setup

This project deploys as a static site with one Vercel serverless configuration endpoint. Supabase credentials are required for cloud editing; the front end receives only the public anon/publishable key.

## Supabase checklist

- [ ] Create a Supabase project.
- [ ] Create the sole owner account under **Authentication → Users**; public signups stay disabled.
- [ ] Copy its Auth UUID.
- [ ] Replace **all** `OWNER_USER_UUID` placeholders in `supabase/setup.sql` and run the script in Supabase SQL Editor.
- [ ] Confirm the `site_content` table has the seeded `main` record and `site-media` bucket exists. Rerun the updated setup script when adding video support to an existing project; the seed will not overwrite saved content.
- [ ] Copy the Project URL and anon/publishable key from **Project Settings → API**.
- [ ] Never use the `service_role` key in this app.

The setup SQL sets RLS, public read access for published content, owner-only write access, and public-read/owner-write access for site media. Public URLs are necessary for the unauthenticated romantic website to display uploaded content. The dashboard accepts MP4/WebM video messages up to 50 MB, stores the file in `site-media`, and saves its URL/path in the published content row.

## Vercel + GitHub

1. Push this project to GitHub.
2. In Vercel select **Add New → Project**, connect GitHub, and import the repository.
3. Set Root Directory to the project folder when it is nested inside a repository. No framework build command or output directory is needed.
4. Add these environment variables for the desired deployment environments:

   | Name | Value |
   | --- | --- |
   | `SUPABASE_URL` | Supabase Project URL |
   | `SUPABASE_ANON_KEY` | Supabase anon/publishable key |

5. Deploy/redeploy. Vercel assigns the default `.vercel.app` address; no paid custom domain is needed.
6. Visit `/admin`, sign in as the owner, save a small text change, then verify the public site after refresh.
7. For local Vercel development, copy `.env.example` to `.env.local`, fill it with the same public values, and run `vercel dev`.

`vercel.json` rewrites `/admin` and `/admin/` to the dashboard HTML, so the route works on direct navigation and refresh. `api/config.js` reads Vercel environment variables server-side and returns only the Supabase URL and public anon key.

## Validate access

- Public visitor: opens `/` without login; receives only the `is_published = true` content row.
- Owner: can sign into `/admin`; client verifies the row's owner UUID and RLS independently restricts writes/uploads.
- Other authenticated user: cannot pass the owner UUID check or write through RLS.
- Registration: no dashboard sign-up UI; disable new-user registration in Supabase Auth.

Supabase credentials are not present in the workspace, so authentication, remote database writes, and real file upload/playback require completing the setup above. Local fallback rendering, syntax, responsive layouts, and non-configured dashboard behavior can be checked without credentials.
