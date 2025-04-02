import { NextResponse } from "next/server"

// In a real app, this would be stored in a database
let trafficReports = [
  {
    id: 1,
    type: "accident",
    severity: "high",
    location: [-74.42, 40.12],
    description: "Multiple vehicle collision on I-95 Northbound near exit 23. Right lane blocked.",
    reportedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    reportedBy: "user123",
    verified: true,
  },
  {
    id: 2,
    type: "construction",
    severity: "medium",
    location: [-74.48, 40.07],
    description: "Road work on Main Street between 5th and 7th Avenue. Expect delays.",
    reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reportedBy: "user456",
    verified: true,
  },
]

// Get all traffic reports
export async function GET() {
  try {
    return NextResponse.json({ reports: trafficReports })
  } catch (error) {
    console.error("Error fetching traffic reports:", error)
    return NextResponse.json({ error: "Failed to fetch traffic reports" }, { status: 500 })
  }
}

// Create a new traffic report
export async function POST(request: Request) {
  try {
    const { type, severity, location, description } = await request.json()

    if (!type || !severity || !location || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const newReport = {
      id: trafficReports.length + 1,
      type,
      severity,
      location,
      description,
      reportedAt: new Date().toISOString(),
      reportedBy: "currentUser", // In a real app, this would be the authenticated user
      verified: false,
    }

    trafficReports = [...trafficReports, newReport]

    return NextResponse.json({ report: newReport })
  } catch (error) {
    console.error("Error creating traffic report:", error)
    return NextResponse.json({ error: "Failed to create traffic report" }, { status: 500 })
  }
}

