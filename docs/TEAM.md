# Team collaboration guide

## Required repository access
Your teammates only need:
- GitHub repo access
- Firebase project role access
- deployment platform access for Netlify/Vercel, when relevant

They do not need to know your personal Firebase secret values if those are configured as repository or deployment secrets.

## Required secrets
Add the following to GitHub repository secrets or your deployment platform:

- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
- NETLIFY_AUTH_TOKEN (only if using Netlify deployment)
- NETLIFY_SITE_ID (only if using Netlify deployment)

## Local development
Use Node 20:

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 20
npm install
npm run typecheck
npm run build
```

## Firebase setup
1. Enable Authentication => Email/Password
2. Enable Firestore
3. Upload the rules from firestore.rules
4. Seed the service data using the admin script if needed

## GitHub Discussions
Use the repository Discussions tab for feature notes, QA reports, design feedback, and deployment changes.
