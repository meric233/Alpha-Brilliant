import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { setGlobalOptions } from 'firebase-functions/v2'
import OpenAI from 'openai'

// OpenAI API key is stored as a Firebase secret (never shipped to the client).
// Set it with:  firebase functions:secrets:set OPENAI_API_KEY
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY')

// Model can be overridden per-deploy via the OPENAI_MODEL env var.
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

setGlobalOptions({ region: 'us-central1', maxInstances: 10 })

type AiKind = 'json' | 'text'

interface AiRequest {
  kind: AiKind
  prompt: string
  jsonSchema?: Record<string, unknown>
  schemaName?: string
  maxTokens?: number
}

const SYSTEM_PROMPT =
  'You are a precise grading and interpretation assistant for an AP Physics C ' +
  'projectile-motion learning app. Follow the user instructions exactly. ' +
  'Never reveal numeric answers or suggest specific quantity names unless the ' +
  'instructions explicitly ask you to.'

/**
 * Server-side proxy to OpenAI. The client calls this callable; the API key
 * stays on the server. Requires an authenticated Firebase user.
 *
 * Returns { text } where `text` is the model output. For kind === 'json' the
 * text is a JSON string conforming to the supplied schema (the client parses).
 */
// App Check is ENFORCED: only the real app (with a valid reCAPTCHA token) and
// registered debug tokens can call this function. The client wires App Check in
// src/lib/firebase.ts (gated on VITE_RECAPTCHA_SITE_KEY); localhost uses a
// registered debug token.
export const aiGenerate = onCall(
  { secrets: [OPENAI_API_KEY], enforceAppCheck: true },
  async (request): Promise<{ text: string }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in to use AI features.')
    }

    const data = request.data as AiRequest | undefined
    if (!data || typeof data.prompt !== 'string' || !data.prompt.trim()) {
      throw new HttpsError('invalid-argument', 'A non-empty "prompt" is required.')
    }
    if (data.kind !== 'json' && data.kind !== 'text') {
      throw new HttpsError('invalid-argument', '"kind" must be "json" or "text".')
    }

    const client = new OpenAI({ apiKey: OPENAI_API_KEY.value() })

    try {
      const completion = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: data.prompt },
        ],
        temperature: 0,
        max_completion_tokens: data.maxTokens ?? 700,
        ...(data.kind === 'json' && data.jsonSchema
          ? {
              response_format: {
                type: 'json_schema',
                json_schema: {
                  name: data.schemaName || 'response',
                  strict: true,
                  schema: data.jsonSchema,
                },
              },
            }
          : {}),
      })

      const text = completion.choices[0]?.message?.content ?? ''
      return { text }
    } catch (err) {
      console.error('OpenAI request failed:', err)
      throw new HttpsError('internal', 'The AI request failed. Please try again.')
    }
  },
)
