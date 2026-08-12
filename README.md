# Symptom Log

A daily tracker for physical and emotional symptoms while on endocrine therapy,
built around one question: **did this drug do this to me?**

Aromatase inhibitor side effects are hard to attribute. Joint pain at month
three could be the anastrozole, or post-chemo recovery, or surgical recovery, or
chemo-induced menopause. And if you switch from one AI to another, which a lot
of people do because musculoskeletal side effects are the top reason people stop
taking them, you need something better than memory to know whether the switch
helped.

So the app is built to answer that:

- **Baseline capture.** Days logged before you start a drug automatically become
  the period everything else gets compared against.
- **Medication bands on every chart.** A change that starts at a band edge is
  worth raising. A change in the middle of one usually is not the drug.
- **A compare screen.** Pick two stretches, anastrozole against letrozole or
  before against after, and see the median for every symptom side by side.
- **Adherence.** Missed doses sit next to the charts, so a rough fortnight does
  not get read as the drug doing something it did not.
- **A printable report** for appointments, over any date range.
- **An IFS layer**, so who showed up gets logged alongside how the body felt.

---

## Setting it up

You need a free Supabase project. Two minutes of clicking, then the app walks
you through it.

1. **Make a project** at [supabase.com](https://supabase.com). Free tier is
   plenty. Pick a region near you.
2. **Create the tables.** Open the SQL Editor in your project, paste in
   [`supabase/schema.sql`](supabase/schema.sql), and run it. The setup screen in
   the app has a copy button for the same SQL.
3. **Connect it.** In the app, paste your Project URL and the **anon public**
   key from Settings → API. Not the `service_role` key, that one bypasses every
   security rule and the app will refuse it.
4. **Make an account** with an email and password. That account is the only
   thing that can read your rows.

### About the keys

The anon key is a publishable browser key. It is designed to ship inside a web
page. Every table has row level security switched on with a `auth.uid() =
user_id` policy, so the key on its own reads nothing at all. Your data is only
reachable by your signed-in session.

Connection details are stored in your browser's localStorage rather than baked
into the build, so nothing sensitive lands in the repo. You enter them once per
device.

---

## Running it

```bash
npm install
npm run dev
```

Add `?demo` to the address to load 150 days of made up data, including a switch
from anastrozole to letrozole, so you can see every screen with something in it.
Demo data is entirely in memory and is never saved.

To build:

```bash
npm run build
```

The output in `dist/` is plain static files with a relative base path, so it
works on GitHub Pages, Netlify, Cloudflare Pages, a subfolder, or opened
straight off disk.

### Optional: bake the connection in at build time

If you would rather not paste the URL and key on each device, put them in
`.env.local` and the setup screen is skipped:

```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Getting your data out

Settings has CSV and JSON export. CSV is one row per day per symptom and opens
straight into a spreadsheet. JSON is the complete copy including medications,
events, parts and notes. It is your data, so take a copy whenever you want one.

---

## What the numbers mean

- **Median**, not average, is used throughout. It is the middle day, so one
  terrible week does not drag the whole picture.
- **"Worth raising"** flags a shift of at least 2 points on a 0 to 10 scale
  (or 15 minutes of morning stiffness, or 2 more hot flashes a day) with at
  least 10 logged days on both sides. It is a reading aid on your own data, not
  a statistical test, and it cannot separate the drug from everything else that
  was happening at the same time.
- **Trend lines** are a 7 day rolling median. Raw days are drawn as dots
  underneath so the noise stays visible rather than being smoothed away
  silently.
- **Gaps in logging are not good days.** Every screen shows how many days were
  actually logged.

This is a self-reported diary. It is not a medical device and it does not give
advice. What it does is make a conversation with your oncologist concrete.

---

## Stack

React, TypeScript, Vite, Supabase. Charts are hand-rolled SVG, no charting
library, so the medication bands and the dumbbell facets behave exactly as
intended. Colours follow a validated categorical palette that passes
colour-vision-deficiency separation checks in both light and dark mode.
