import { NextResponse } from "next/server"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")

    if (!lat || !lng) {
      return NextResponse.json({ error: "Latitude and longitude are required" }, { status: 400 })
    }

    if (!MAPBOX_TOKEN) {
      return NextResponse.json({ error: "Mapbox token not configured" }, { status: 500 })
    }

    // Use Mapbox Geocoding API to reverse geocode coordinates
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`,
    )

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error reverse geocoding:", error)
    return NextResponse.json({ error: "Failed to reverse geocode location" }, { status: 500 })
  }
}

