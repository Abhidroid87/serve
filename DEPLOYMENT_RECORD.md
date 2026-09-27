# Clean GitHub Deployment Record

## Scope
This project was reset so it is owned by the current GitHub account and no longer connected to the previous owner’s GitHub repo.

## Actions taken
1. Confirmed the active GitHub account is `Abhidroid87`.
2. Removed the stale remote pointing to `https://github.com/Deng-977/serve.git`.
3. Rebuilt the repository history from a clean branch to avoid carrying prior ownership traces.
4. Created a fresh GitHub repository under the user’s account and pushed the project code.
5. Added a Firebase environment template for the app.

## Required next setup
- Copy `.env.example` to `.env.local` and replace the placeholder values with your real Firebase config.
- Enable Email/Password authentication in Firebase.
- Enable Cloud Firestore and add the required collections.
- Run `npm install` and `npm run build` locally before deploying.

## Run locally
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Build check
```bash
npm run build
```

## Deployment note
This repository is now set as an independent project under the current account. Firebase deployment still needs the real project config values to be inserted before hosting or runtime use.
