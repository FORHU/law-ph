import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { conversation_id, role, content, imagePreview, timestamp } = await req.json()

  if (!conversation_id || !role || !content) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from("messages")
    .insert({
      conversation_id,
      role,
      content,
      imagePreview: imagePreview || null,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    })

  if (error) {
    console.error("Supabase insert error:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}

export async function GET(req: Request) {
  return NextResponse.json({ message: "GET method not implemented" })
}
