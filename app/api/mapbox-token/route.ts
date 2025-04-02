import { NextResponse } from "next/server"

// This endpoint safely provides the Mapbox token to the client
// It's better to fetch it this way rather than exposing it directly in client code
export async function GET() {
  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

    if (!token) {
      return NextResponse.json({ error: "Mapbox token not configured" }, { status: 404 })
    }

    return NextResponse.json({ token })
  } catch (error) {
    console.error("Error fetching Mapbox token:", error)
    return NextResponse.json({ error: "Failed to fetch Mapbox token" }, { status: 500 })
  }
}

