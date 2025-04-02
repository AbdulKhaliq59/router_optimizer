import { NextResponse } from "next/server"

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { origin, destination } = body

    if (!origin || !destination) {
      return NextResponse.json({ error: "Origin and destination are required" }, { status: 400 })
    }

    if (!MAPBOX_TOKEN) {
      return NextResponse.json({ error: "Mapbox token not configured" }, { status: 500 })
    }

    // In a real app, we would call the Mapbox Directions API here
    // For this demo, we'll simulate the response

    // Extract coordinates
    const originCoords = origin.coordinates || [-74.5, 40]
    const destCoords = destination.coordinates || [-74.35, 40.15]

    // Generate a route between the points
    const routes = generateRoutes(originCoords, destCoords)

    return NextResponse.json({ routes })
  } catch (error) {
    console.error("Error calculating routes:", error)
    return NextResponse.json({ error: "Failed to calculate routes" }, { status: 500 })
  }
}

// Helper function to generate simulated routes
function generateRoutes(origin: [number, number], destination: [number, number]) {
  // Calculate a midpoint with some variation for different routes
  const midLng1 = origin[0] + (destination[0] - origin[0]) * 0.4
  const midLat1 = origin[1] + (destination[1] - origin[1]) * 0.4

  const midLng2 = origin[0] + (destination[0] - origin[0]) * 0.3
  const midLat2 = origin[1] + (destination[1] - origin[1]) * 0.6

  const midLng3 = origin[0] + (destination[0] - origin[0]) * 0.6
  const midLat3 = origin[1] + (destination[1] - origin[1]) * 0.3

  // Calculate approximate distances
  const directDistance = calculateDistance(origin, destination)

  return [
    {
      id: 1,
      name: "Fastest Route",
      duration: `${Math.round(directDistance * 2)} mins`,
      distance: `${directDistance.toFixed(1)} miles`,
      trafficLevel: "moderate",
      incidents: 0,
      path: [origin, [midLng1, midLat1], destination],
    },
    {
      id: 2,
      name: "Alternative Route",
      duration: `${Math.round(directDistance * 2.2)} mins`,
      distance: `${(directDistance * 0.95).toFixed(1)} miles`,
      trafficLevel: "light",
      incidents: 0,
      path: [origin, [midLng2, midLat2], destination],
    },
    {
      id: 3,
      name: "Avoid Highways",
      duration: `${Math.round(directDistance * 2.5)} mins`,
      distance: `${(directDistance * 0.9).toFixed(1)} miles`,
      trafficLevel: "light",
      incidents: 1,
      path: [origin, [midLng3, midLat3], destination],
    },
  ]
}

// Helper function to calculate distance between two points
function calculateDistance(point1: [number, number], point2: [number, number]) {
  // Simple approximation for demo purposes
  const lng1 = point1[0]
  const lat1 = point1[1]
  const lng2 = point2[0]
  const lat2 = point2[1]

  // Convert to radians
  const rlat1 = (lat1 * Math.PI) / 180
  const rlng1 = (lng1 * Math.PI) / 180
  const rlat2 = (lat2 * Math.PI) / 180
  const rlng2 = (lng2 * Math.PI) / 180

  // Haversine formula
  const dlng = rlng2 - rlng1
  const dlat = rlat2 - rlat1
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(dlng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  // Radius of earth in miles
  const R = 3956

  // Calculate distance
  return R * c
}

