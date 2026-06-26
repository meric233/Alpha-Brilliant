import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const app = initializeApp(firebaseConfig)

// App Check proves requests originate from this real app, protecting the OpenAI
// proxy (and other backends) from scripted abuse / cost. It only initializes
// when a reCAPTCHA v3 site key is configured, so local dev without a key still
// works. To activate enforcement end-to-end: set VITE_RECAPTCHA_SITE_KEY, then
// flip `enforceAppCheck: true` in functions/src/index.ts and redeploy.
const appCheckSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
if (appCheckSiteKey) {
  // In dev, use an App Check debug token so localhost passes enforcement.
  // Leaving VITE_APPCHECK_DEBUG_TOKEN unset prints a fresh token to the console
  // on first load — register it in Firebase console → App Check → Manage debug
  // tokens. Once registered you can pin it via VITE_APPCHECK_DEBUG_TOKEN.
  if (import.meta.env.DEV) {
    const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN
    ;(
      globalThis as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken ?? true
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

export const auth = getAuth(app)
export const db = getFirestore(app)

isSupported().then((ok) => {
  if (ok) getAnalytics(app)
})
