import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
    }

    // For short URLs like goo.gl/maps, we need to follow redirects
    let finalUrl = url

    // If it's a short URL, follow redirects to get the full URL
    if (url.includes("goo.gl") || url.includes("maps.app.goo.gl")) {
      try {
        const response = await fetch(url, { redirect: "follow", method: "HEAD" })
        finalUrl = response.url
      } catch (error) {
        console.error("Error following redirect:", error)
        // Continue with the original URL if redirect fails
      }
    }

    // Try to extract coordinates from the URL
    const coordinates = extractCoordinatesFromUrl(finalUrl)

    if (!coordinates) {
      // If we couldn't extract coordinates, return an error
      return NextResponse.json({ error: "Could not extract coordinates from the provided URL" }, { status: 400 })
    }

    return NextResponse.json({ coordinates })
  } catch (error) {
    console.error("Error parsing Google Maps link:", error)
    return NextResponse.json({ error: "Failed to parse Google Maps link" }, { status: 500 })
  }
}

// Function to extract coordinates from a Google Maps URL
function extractCoordinatesFromUrl(url: string): [number, number] | null {
  try {
    // Try different patterns that Google Maps uses

    // Pattern: @lat,lng,zoom
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (atMatch) {
      return [Number.parseFloat(atMatch[2]), Number.parseFloat(atMatch[1])]
    }

    // Pattern: q=lat,lng
    const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (qMatch) {
      return [Number.parseFloat(qMatch[2]), Number.parseFloat(qMatch[1])]
    }

    // Pattern: ll=lat,lng
    const llMatch = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (llMatch) {
      return [Number.parseFloat(llMatch[2]), Number.parseFloat(llMatch[1])]
    }

    // Pattern: daddr=lat,lng (destination address)
    const daddrMatch = url.match(/[?&]daddr=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (daddrMatch) {
      return [Number.parseFloat(daddrMatch[2]), Number.parseFloat(daddrMatch[1])]
    }

    // Pattern: saddr=lat,lng (source address)
    const saddrMatch = url.match(/[?&]saddr=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (saddrMatch) {
      return [Number.parseFloat(saddrMatch[2]), Number.parseFloat(saddrMatch[1])]
    }

    return null
  } catch (error) {
    console.error("Error extracting coordinates:", error)
    return null
  }
}

