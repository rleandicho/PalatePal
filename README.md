# PalatePal

Can't decide where to eat? PalatePal shows two nearby restaurants at a time. Keep the one you
like better, a new challenger replaces the other, and the last one standing is dinner.

- Pickup or delivery, search radius, number of rounds
- Dietary needs and allergies to avoid
- Skip places or whole cuisines you've already had this week (remembered for 7 days)
- Links to the menu, ordering, and directions in Google Maps or Apple Maps
- Installable to the home screen (PWA), with layouts for phones, foldables and tablets

Restaurant data comes from the Google Places API (New) through a serverless function in `api/`,
so the API key never reaches the browser.

## Local development

```sh
npm install
cp .env.example .env.local   # then add your GOOGLE_MAPS_API_KEY
npm run dev
```

No key yet? `npm run dev:mock` uses built-in demo restaurants instead.

`npm run dev` also serves the `api/` functions, so the Vercel CLI isn't needed locally.

## Google Cloud setup

1. Create a project at https://console.cloud.google.com and attach a billing account.
2. Enable **Places API (New)** and **Geocoding API**.
3. Create an API key under *APIs & Services → Credentials* and restrict it to those two APIs.
4. Set daily quota limits on both APIs and a budget alert under *Billing → Budgets & alerts*,
   so a traffic spike or abuse can't run up a large bill.

## Deploying to Vercel

1. Import this repository at https://vercel.com/new (framework preset: Vite).
2. Add `GOOGLE_MAPS_API_KEY` under *Settings → Environment Variables*.
3. Deploy. Every push to `main` redeploys; HTTPS is automatic, including on custom domains.

## Data notes

Google doesn't provide signature dishes, allergen data, diets other than vegetarian, or which
delivery apps a restaurant uses. The app shows Google's description instead of a dish, guesses
allergen risks from the cuisine type and labels them as unverified, and links to each delivery
app's search when a place delivers.
