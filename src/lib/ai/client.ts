import { getFunctions, httpsCallable, type HttpsCallable } from 'firebase/functions'
import { app } from '../firebase'

// AI runtime: OpenAI, called through a Firebase Cloud Function proxy
// (`functions/src/index.ts`). The OpenAI API key lives only on the server as a
// Firebase secret; the browser never sees it. The callable requires an
// authenticated Firebase user.
//
// The function is deployed in us-central1 (see setGlobalOptions in the
// function). Keep this region in sync if you change it.
//
// App Check: the client initializes it in `src/lib/firebase.ts` (reCAPTCHA v3,
// gated on VITE_RECAPTCHA_SITE_KEY). Enforcement on the function is activated by
// flipping `enforceAppCheck: true` in functions/src/index.ts and redeploying.

const REGION = 'us-central1'
const DEFAULT_TIMEOUT_MS = 15000

type AiKind = 'json' | 'text'

interface AiRequest {
  kind: AiKind
  prompt: string
  jsonSchema?: Record<string, unknown>
  schemaName?: string
  maxTokens?: number
}

interface AiResponse {
  text: string
}

let _callable: HttpsCallable<AiRequest, AiResponse> | null = null
function callable(): HttpsCallable<AiRequest, AiResponse> {
  if (!_callable) {
    const functions = getFunctions(app, REGION)
    _callable = httpsCallable<AiRequest, AiResponse>(functions, 'aiGenerate')
  }
  return _callable
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('AI request timed out')), ms)
    p.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

/**
 * Generate a JSON object that conforms to `jsonSchema` (an OpenAI-compatible,
 * strict JSON Schema) using structured output. Throws on timeout / network /
 * parse failure so callers can tell the learner the grader is unavailable
 * (there is no offline fallback). NEVER used to grade a value — only to
 * produce/interpret language (see Prime Directive in PRD-Phase2.md §3).
 */
export async function generateJson<T>(
  prompt: string,
  jsonSchema: Record<string, unknown>,
  schemaName = 'response',
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const res = await withTimeout(
    callable()({ kind: 'json', prompt, jsonSchema, schemaName }),
    timeoutMs,
  )
  return JSON.parse(res.data.text) as T
}

/**
 * Generate a short plain-text response. Used only for learner-facing prose
 * (e.g. explaining why a free-text quantity name couldn't be matched) — never
 * to grade or compute a value. Throws on timeout / network failure so callers
 * can silently skip the explanation.
 */
export async function generateText(
  prompt: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<string> {
  const res = await withTimeout(callable()({ kind: 'text', prompt }), timeoutMs)
  return res.data.text
}
