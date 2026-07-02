import { NextRequest, NextResponse } from "next/server"

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

export async function POST(req: NextRequest) {
  try {
    const { problems, solvedCount, totalCount, weakTags } = await req.json()

    const prompt = `A competitive programmer just finished a contest.

Problems: ${JSON.stringify(problems)}
Solved: ${solvedCount}/${totalCount}
Their weak tags historically: ${JSON.stringify(weakTags)}

Give a brief 3-point analysis:
1. What this performance suggests about their current level
2. Which specific topics to focus on next
3. One concrete next step

Keep it concise and encouraging, no more than 120 words total. Write in plain text only — no markdown formatting, no asterisks, no bold.`

    const apiKey = process.env.GEMINI_API_KEY

    console.log(
      "GEMINI_API_KEY present:",
      !!apiKey,
      "length:",
      apiKey?.length
    )

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 }
      )
    }

    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    })

    console.log("Gemini response status:", res.status)

    if (!res.ok) {
      const errText = await res.text()
      console.error("Gemini API error:", res.status, errText)

      return NextResponse.json(
        { error: errText },
        { status: res.status }
      )
    }

    const data = await res.json()

    const rawAnalysis =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? null

    if (!rawAnalysis) {
      console.error("No analysis in response:", JSON.stringify(data))

      return NextResponse.json(
        { error: "No analysis returned" },
        { status: 500 }
      )
    }

    // Remove any accidental markdown formatting
    const analysis = rawAnalysis
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .trim()

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error("POST /api/analysis error:", error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}