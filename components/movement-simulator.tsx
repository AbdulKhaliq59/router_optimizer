"use client"

import { useEffect, useRef } from "react"
import { useNavigation } from "@/contexts/navigation-context"
import { calculateDistance } from "@/utils/navigation-helpers"

// This component simulates user movement along the route
export default function MovementSimulator() {
  const { isNavigating, activeRoute, currentPosition, updateUserPosition } = useNavigation()

  const simulationRef = useRef<NodeJS.Timeout | null>(null)
  const currentIndexRef = useRef(0)
  const speedRef = useRef(0.00005) // Speed of movement (adjusted for simulation)

  useEffect(() => {
    // Start simulation when navigation begins
    if (isNavigating && activeRoute && activeRoute.path.length > 1) {
      // Clear any existing simulation
      if (simulationRef.current) {
        clearInterval(simulationRef.current)
      }

      // Reset to start of route
      currentIndexRef.current = 0

      // Start the simulation
      startSimulation()
    }

    // Clean up on unmount or when navigation stops
    return () => {
      if (simulationRef.current) {
        clearInterval(simulationRef.current)
      }
    }
  }, [isNavigating, activeRoute])

  const startSimulation = () => {
    if (!activeRoute) return

    const path = activeRoute.path
    let currentIndex = 0
    let progress = 0

    // Use the actual current position as starting point if available
    let currentPos = currentPosition || path[0]

    simulationRef.current = setInterval(() => {
      if (currentIndex >= path.length - 1) {
        // End of route reached
        if (simulationRef.current) {
          clearInterval(simulationRef.current)
        }
        return
      }

      const start = path[currentIndex]
      const end = path[currentIndex + 1]

      // Calculate direction vector
      const dx = end[0] - start[0]
      const dy = end[1] - start[1]

      // Calculate segment length
      const segmentLength = calculateDistance(start, end)

      // Update progress along current segment
      progress += speedRef.current

      if (progress >= segmentLength) {
        // Move to next segment
        currentIndex++
        progress = 0
        currentIndexRef.current = currentIndex

        // If we've reached the end, stop simulation
        if (currentIndex >= path.length - 1) {
          if (simulationRef.current) {
            clearInterval(simulationRef.current)
          }
          return
        }
      } else {
        // Calculate new position along segment
        const ratio = progress / segmentLength
        const newPos: [number, number] = [start[0] + dx * ratio, start[1] + dy * ratio]

        // Update the current position
        currentPos = newPos
        updateUserPosition(newPos)
      }
    }, 100) // Update every 100ms for smooth animation
  }

  // This is a utility component with no UI
  return null
}

