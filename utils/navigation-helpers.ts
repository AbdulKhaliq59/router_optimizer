// Helper functions for navigation and route guidance

// Get direction from bearing
export function getDirectionFromBearing(bearing: number): string {
  const directions = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"]
  const index = Math.round(bearing / 45) % 8
  return directions[index]
}

// Calculate bearing between two points
export function calculateBearing(point1: [number, number], point2: [number, number]): number {
  const lng1 = (point1[0] * Math.PI) / 180
  const lat1 = (point1[1] * Math.PI) / 180
  const lng2 = (point2[0] * Math.PI) / 180
  const lat2 = (point2[1] * Math.PI) / 180

  const y = Math.sin(lng2 - lng1) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1)
  const bearing = (Math.atan2(y, x) * 180) / Math.PI

  return (bearing + 360) % 360
}

// Calculate distance between two points
export function calculateDistance(point1: [number, number], point2: [number, number]): number {
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

// Generate turn instruction based on current and next segment
export function generateTurnInstruction(prevBearing: number | null, currentBearing: number, distance: number): string {
  if (prevBearing === null) {
    // First segment
    const direction = getDirectionFromBearing(currentBearing)
    return `Head ${direction} for ${distance.toFixed(1)} miles`
  }

  // Calculate the angle between the previous and current bearing
  let angle = currentBearing - prevBearing
  if (angle < -180) angle += 360
  if (angle > 180) angle -= 360

  // Determine the turn direction and sharpness
  let turnDirection: string
  if (Math.abs(angle) < 20) {
    return `Continue straight for ${distance.toFixed(1)} miles`
  } else if (angle >= 20 && angle < 60) {
    turnDirection = "slight right"
  } else if (angle >= 60 && angle < 120) {
    turnDirection = "right"
  } else if (angle >= 120) {
    turnDirection = "sharp right"
  } else if (angle <= -20 && angle > -60) {
    turnDirection = "slight left"
  } else if (angle <= -60 && angle > -120) {
    turnDirection = "left"
  } else {
    turnDirection = "sharp left"
  }

  return `Turn ${turnDirection} and continue for ${distance.toFixed(1)} miles`
}

// Generate detailed navigation steps from a route path
export function generateDetailedNavigationSteps(path: [number, number][]): Array<{
  instruction: string
  distance: string
  coordinates: [number, number]
  bearing: number
  maneuver: string
}> {
  if (path.length < 2) return []

  const steps = []
  let prevBearing: number | null = null

  // Generate steps for each segment of the path
  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i]
    const next = path[i + 1]

    // Calculate bearing to determine direction
    const bearing = calculateBearing(current, next)

    // Calculate distance for this segment
    const distance = calculateDistance(current, next)
    const distanceStr = `${distance.toFixed(1)} miles`

    // Determine the maneuver type
    let maneuver = "straight"
    if (prevBearing !== null) {
      const angle = bearing - prevBearing
      const normalizedAngle = ((angle + 180) % 360) - 180

      if (normalizedAngle > 30) maneuver = "right"
      else if (normalizedAngle < -30) maneuver = "left"
      else if (normalizedAngle > 10) maneuver = "slight-right"
      else if (normalizedAngle < -10) maneuver = "slight-left"
      else if (normalizedAngle > 100) maneuver = "sharp-right"
      else if (normalizedAngle < -100) maneuver = "sharp-left"
      else if (Math.abs(normalizedAngle) > 170) maneuver = "uturn"
    }

    // Create instruction
    const instruction = generateTurnInstruction(prevBearing, bearing, distance)

    // Add step
    steps.push({
      instruction,
      distance: distanceStr,
      coordinates: current,
      bearing,
      maneuver,
    })

    prevBearing = bearing
  }

  // Add final step for arrival
  steps.push({
    instruction: "Arrive at your destination",
    distance: "0 miles",
    coordinates: path[path.length - 1],
    bearing: prevBearing || 0,
    maneuver: "arrive",
  })

  return steps
}

