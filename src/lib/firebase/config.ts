/**
 * Firebase configuration — drop-in template.
 *
 * Phase 0 ships with Firebase OFF by default. To enable:
 *   1. Create a Firebase project at https://console.firebase.google.com.
 *   2. Add a Web App, copy the config object.
 *   3. Either:
 *        - Edit this file directly with your config, OR
 *        - Set VITE_FIREBASE_* env vars (see .env.example) and the code will pick them up.
 *   4. Set VITE_FIREBASE_ENABLED=true to turn on auth + persistence.
 *
 * The app must work fully without Firebase — auth and saved designs are
 * additive features, not preconditions.
 */
export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const env = import.meta.env;

export const firebaseEnabled: boolean = env.VITE_FIREBASE_ENABLED === 'true';

export const firebaseConfig: FirebaseConfig | null = firebaseEnabled
  ? {
      apiKey: env.VITE_FIREBASE_API_KEY ?? '',
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
      projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
      appId: env.VITE_FIREBASE_APP_ID ?? '',
    }
  : null;
