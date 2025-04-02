import { NextResponse } from "next/server"

// Simulated traffic data
const trafficData = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        congestion: "high",
        speed: 15,
        speedLimit: 55,
        roadName: "I-95 North",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [-74.5, 40],
          [-74.45, 40.05],
          [-74.4, 40.1],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        congestion: "medium",
        speed: 35,
        speedLimit: 55,
        roadName: "Route 1",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [-74.52, 40.02],
          [-74.48, 40.07],
          [-74.42, 40.12],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        congestion: "low",
        speed: 45,
        speedLimit: 45,
        roadName: "Main Street",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [-74.48, 40.03],
          [-74.45, 40.08],
        ],
      },
    },
  ],
}

// Simulated traffic incidents
const trafficIncidents = [
  {
    id: 1,
    type: "accident",
    severity: "high",
    location: [-74.42, 40.12],
    description: "Multiple vehicle collision",
    reportedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    verified: true,
  },
  {
    id: 2,
    type: "construction",
    severity: "medium",
    location: [-74.48, 40.07],
    description: "Road work",
    reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    verified: true,
  },
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bounds = searchParams.get("bounds")

    // In a real app, we would filter data based on bounds

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    return NextResponse.json({
      traffic: trafficData,
      incidents: trafficIncidents,
    })
  } catch (error) {
    console.error("Error fetching traffic data:", error)
    return NextResponse.json({ error: "Failed to fetch traffic data" }, { status: 500 })
  }
}

