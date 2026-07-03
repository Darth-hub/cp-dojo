import { NextResponse } from "next/server"
import { getAllProblems } from "@/services/problem.service"

export const revalidate = 3600

export async function GET() {
  const res = await getAllProblems()
  if (!res.success) {
    return NextResponse.json({ error: res.error }, { status: 500 })
  }
  return NextResponse.json(res.data)
}