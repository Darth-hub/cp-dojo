import { afterEach, describe, expect, it, vi } from "vitest"
import { computeSignature, fetchAdaptiveModel } from "@/lib/modelService"

const TEST_SECRET = "test-secret-that-is-at-least-32-characters-long"

describe("computeSignature", () => {
  it("matches the Python service's known vector", () => {
    // Same vector is asserted in model-service/tests/test_api.py
    const signature = computeSignature(
      TEST_SECRET,
      "1700000000",
      "POST",
      "/v1/models",
      '{"cf_handle":"tourist","platform_rating":1500}'
    )
    expect(signature).toBe("4b15674ee29ca2dfeb83d93fc0931e061fcca2d9f66a4a2e29ea60e6fa15d4e7")
  })
})

describe("fetchAdaptiveModel", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("returns null without calling out when the service is not configured", async () => {
    vi.stubEnv("MODEL_SERVICE_URL", "")
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    expect(await fetchAdaptiveModel("tourist", 1500)).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("falls back to null when the service errors", async () => {
    vi.stubEnv("MODEL_SERVICE_URL", "https://model.test")
    vi.stubEnv("MODEL_SERVICE_SECRET", TEST_SECRET)
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("down", { status: 503 })))

    expect(await fetchAdaptiveModel("tourist", 1500)).toBeNull()
  })

  it("falls back to null when the request throws (timeout, DNS, ...)", async () => {
    vi.stubEnv("MODEL_SERVICE_URL", "https://model.test")
    vi.stubEnv("MODEL_SERVICE_SECRET", TEST_SECRET)
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")))

    expect(await fetchAdaptiveModel("tourist", 1500)).toBeNull()
  })

  it("sends signed headers and returns the trained model", async () => {
    vi.stubEnv("MODEL_SERVICE_URL", "https://model.test/")
    vi.stubEnv("MODEL_SERVICE_SECRET", TEST_SECRET)
    const trainedModel = {
      weights: { w0: 0.1, w1: -1.2, w2: 0.8 },
      tag_solve_rate: { dp: 0.5 },
      training_examples: 42,
    }
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ status: "trained", model: trainedModel })
    )
    vi.stubGlobal("fetch", fetchMock)

    expect(await fetchAdaptiveModel("tourist", 1500)).toEqual(trainedModel)

    const [calledUrl, init] = fetchMock.mock.calls[0]
    expect(calledUrl).toBe("https://model.test/v1/models")
    const expectedSignature = computeSignature(
      TEST_SECRET,
      init.headers["X-CPDojo-Timestamp"],
      "POST",
      "/v1/models",
      init.body
    )
    expect(init.headers["X-CPDojo-Signature"]).toBe(expectedSignature)
  })
})
