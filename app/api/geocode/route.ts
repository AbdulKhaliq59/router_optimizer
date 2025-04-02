import { NextResponse } from "next/server"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
    }

    if (!MAPBOX_TOKEN) {
      return NextResponse.json({ error: "Mapbox token not configured" }, { status: 500 })
    }

    // Use Mapbox Geocoding API to search for places
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5`,
    )

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error geocoding:", error)
    return NextResponse.json({ error: "Failed to geocode location" }, { status: 500 })
  }
}

