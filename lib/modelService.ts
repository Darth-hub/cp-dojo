// SERVER-ONLY client for the Python model service (model-service/).
// Uses MODEL_SERVICE_SECRET, so never import this from a "use client" file.
import { createHmac } from "node:crypto"
import type { Weights } from "@/utils/logisticRegression"

const MODEL_PATH = "/v1/models"
const REQUEST_TIMEOUT_MS = 10_000

const TIMESTAMP_HEADER = "X-CPDojo-Timestamp"
const SIGNATURE_HEADER = "X-CPDojo-Signature"

type ModelServiceModel = {
  weights: Weights
  tag_solve_rate: Record<string, number>
  training_examples: number
}

type ModelServiceResponse = {
  status: "trained" | "cold_start"
  model: ModelServiceModel | null
}

// Must match compute_signature() in model-service/app/security.py:
// hex(HMAC-SHA256(secret, `${timestamp}.${METHOD}.${path}.${body}`))
const computeSignature = (
  secret: string,
  timestamp: string,
  method: string,
  path: string,
  body: string
): string => {
  const message = `${timestamp}.${method.toUpperCase()}.${path}.${body}`
  return createHmac("sha256", secret).update(message).digest("hex")
}

// Returns null when the service is unconfigured, slow, down, or the user is
// below the cold-start floor. Callers treat null as "no model" and fall back
// to uniform-random problem selection, so the training page never breaks
// because the model service is unavailable.
const fetchAdaptiveModel = async (
  cfHandle: string,
  platformRating: number
): Promise<ModelServiceModel | null> => {
  const baseUrl = process.env.MODEL_SERVICE_URL
  const secret = process.env.MODEL_SERVICE_SECRET
  if (!baseUrl || !secret) {
    console.warn("model service not configured; falling back to uniform selection")
    return null
  }

  const body = JSON.stringify({ cf_handle: cfHandle, platform_rating: platformRating })
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = computeSignature(secret, timestamp, "POST", MODEL_PATH, body)

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${MODEL_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [TIMESTAMP_HEADER]: timestamp,
        [SIGNATURE_HEADER]: signature,
      },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    })

    if (!response.ok) {
      console.warn("model service returned", response.status)
      return null
    }

    const payload = (await response.json()) as ModelServiceResponse
    return payload.model
  } catch (error) {
    console.warn("model service request failed:", (error as Error).name)
    return null
  }
}

export type { ModelServiceModel }
export { fetchAdaptiveModel, computeSignature }
