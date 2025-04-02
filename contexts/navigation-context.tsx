"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import { useToast } from "@/components/ui/use-toast"
import { useNotifications } from "@/contexts/notification-context"

// Import the navigation helpers
import { calculateDistance, generateDetailedNavigationSteps } from "@/utils/navigation-helpers"

interface Location {
  name: string
  coordinates: [number, number]
}

interface Route {
  id: number
  name: string
  duration: string
  distance: string
  trafficLevel: string
  incidents: number
  path: [number, number][]
}

interface NavigationStep {
  instruction: string
  distance: string
  coordinates: [number, number]
  maneuver?: string
  bearing?: number
}

interface NavigationContextType {
  isNavigating: boolean
  activeRoute: Route | null
  origin: Location | null
  destination: Location | null
  currentPosition: [number, number] | null
  currentStep: NavigationStep | null
  nextStep: NavigationStep | null
  remainingDistance: string
  remainingTime: string
  progress: number
  is3DMode: boolean
  toggle3DMode: () => void
  startNavigation: (route: Route, origin: Location, destination: Location) => void
  stopNavigation: () => void
  recalculateRoute: () => Promise<void>
  voiceEnabled: boolean
  toggleVoice: () => void
  distanceAlertFrequency: "off" | "low" | "medium" | "high"
  setDistanceAlertFrequency: (frequency: "off" | "low" | "medium" | "high") => void
  updateUserPosition: (position: [number, number]) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false)
  const [activeRoute, setActiveRoute] = useState<Route | null>(null)
  const [origin, setOrigin] = useState<Location | null>(null)
  const [destination, setDestination] = useState<Location | null>(null)
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null)
  const [currentStep, setCurrentStep] = useState<NavigationStep | null>(null)
  const [nextStep, setNextStep] = useState<NavigationStep | null>(null)
  const [remainingDistance, setRemainingDistance] = useState("")
  const [remainingTime, setRemainingTime] = useState("")
  const [progress, setProgress] = useState(0)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [is3DMode, setIs3DMode] = useState(false)
  const [distanceAlertFrequency, setDistanceAlertFrequency] = useState<"off" | "low" | "medium" | "high">("medium")

  const watchId = useRef<number | null>(null)
  const lastVoiceAlert = useRef<string>("")
  const lastDistanceAlert = useRef<number>(0)
  const { toast } = useToast()
  const { addNotification } = useNotifications()

  // Clean up geolocation watcher on unmount
  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
      }
    }
  }, [])

  // Toggle 3D mode
  const toggle3DMode = () => {
    setIs3DMode((prev) => !prev)

    // Dispatch event to notify map component
    window.dispatchEvent(
      new CustomEvent("toggle3DMode", {
        detail: { is3DMode: !is3DMode },
      }),
    )

    toast({
      title: !is3DMode ? "3D Mode Enabled" : "3D Mode Disabled",
      description: !is3DMode ? "Viewing map in 3D perspective" : "Switched back to 2D view",
    })
  }

  // Start real-time navigation
  const startNavigation = (route: Route, originLoc: Location, destLoc: Location) => {
    setActiveRoute(route)
    setOrigin(originLoc)
    setDestination(destLoc)
    setIsNavigating(true)

    // Initialize with default values
    setRemainingDistance(route.distance)
    setRemainingTime(route.duration)
    setProgress(0)

    // Generate navigation steps from the route path
    const steps = generateNavigationSteps(route.path)
    if (steps.length > 0) {
      setCurrentStep(steps[0])
      setNextStep(steps.length > 1 ? steps[1] : null)
    }

    // Start tracking user's position
    startPositionTracking()

    // Announce start of navigation
    if (voiceEnabled) {
      speak(`Starting navigation. ${route.distance} to destination. Estimated arrival time: ${route.duration}.`)
    }

    toast({
      title: "Navigation Started",
      description: `Following ${route.name}. ${route.distance} to destination.`,
    })

    // Add notification
    addNotification({
      type: "info",
      title: "Navigation Started",
      message: `Following ${route.name}. ${route.distance} to destination.`,
    })

    // Dispatch event to notify map component
    window.dispatchEvent(
      new CustomEvent("navigationStarted", {
        detail: { route, origin: originLoc, destination: destLoc },
      }),
    )
  }

  // Stop navigation
  const stopNavigation = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }

    setIsNavigating(false)
    setActiveRoute(null)
    setCurrentStep(null)
    setNextStep(null)

    if (voiceEnabled) {
      speak("Navigation stopped.")
    }

    toast({
      title: "Navigation Stopped",
      description: "You can start a new route anytime.",
    })

    // Add notification
    addNotification({
      type: "info",
      title: "Navigation Stopped",
      message: "You can start a new route anytime.",
    })

    // Dispatch event to notify map component
    window.dispatchEvent(new CustomEvent("navigationStopped", {}))
  }

  // Start tracking the user's position
  const startPositionTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      })
      return
    }

    // Clear any existing watch
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
    }

    // Start watching position
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const newPosition: [number, number] = [longitude, latitude]
        setCurrentPosition(newPosition)

        // Update navigation progress
        if (isNavigating && activeRoute) {
          updateNavigationProgress(newPosition)
        }
      },
      (error) => {
        console.error("Error tracking position:", error)
        toast({
          title: "Location Error",
          description: `Failed to track your location: ${error.message}`,
          variant: "destructive",
        })

        // Add notification
        addNotification({
          type: "error",
          title: "Location Error",
          message: `Failed to track your location: ${error.message}`,
        })
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      },
    )
  }

  // Update navigation progress based on current position
  const updateNavigationProgress = (position: [number, number]) => {
    if (!activeRoute || !destination) return

    // Calculate remaining distance
    const totalDistance = Number.parseFloat(activeRoute.distance.replace(" miles", ""))
    const distanceToDestination = calculateDistance(position, destination.coordinates)
    const newRemainingDistance = `${distanceToDestination.toFixed(1)} miles`

    // Calculate remaining time (simple approximation)
    const totalTime = Number.parseInt(activeRoute.duration.replace(" mins", ""))
    const newRemainingTime = `${Math.max(1, Math.round(totalTime * (distanceToDestination / totalDistance)))} mins`

    // Calculate progress percentage
    const newProgress = Math.min(100, Math.max(0, 100 - (distanceToDestination / totalDistance) * 100))

    setRemainingDistance(newRemainingDistance)
    setRemainingTime(newRemainingTime)
    setProgress(newProgress)

    // Check if we need to update the current step
    updateNavigationStep(position)

    // Check if we should announce distance
    checkDistanceAnnouncement(distanceToDestination)

    // Check if we're approaching a turn and should announce it
    checkUpcomingTurn(position)

    // Check if we've arrived at the destination
    if (distanceToDestination < 0.05) {
      // Within 50 meters
      if (voiceEnabled && lastVoiceAlert.current !== "arrived") {
        speak("You have arrived at your destination.")
        lastVoiceAlert.current = "arrived"
      }

      toast({
        title: "Arrived!",
        description: "You have reached your destination.",
      })

      // Add notification
      addNotification({
        type: "success",
        title: "Arrived!",
        message: "You have reached your destination.",
      })

      // Stop navigation after a short delay
      setTimeout(() => {
        stopNavigation()
      }, 5000)
    }

    // Check if we're off route and need to recalculate
    checkIfOffRoute(position)

    // Dispatch event to update the map
    window.dispatchEvent(
      new CustomEvent("navigationUpdated", {
        detail: {
          position,
          remainingDistance: newRemainingDistance,
          remainingTime: newRemainingTime,
          progress: newProgress,
        },
      }),
    )
  }

  // Check if we should announce distance based on frequency setting
  const checkDistanceAnnouncement = (distanceToDestination: number) => {
    if (!voiceEnabled || distanceAlertFrequency === "off") return

    const now = Date.now()
    const timeSinceLastAlert = now - lastDistanceAlert.current

    // Don't announce too frequently
    if (timeSinceLastAlert < 30000) return // At least 30 seconds between alerts

    // Determine announcement thresholds based on frequency setting
    let shouldAnnounce = false
    let message = ""

    if (distanceAlertFrequency === "high") {
      // Every 0.5 mile or at specific milestones
      if (
        Math.abs(Math.round(distanceToDestination * 2) / 2 - distanceToDestination) < 0.05 ||
        (distanceToDestination <= 5 && Math.abs(Math.round(distanceToDestination) - distanceToDestination) < 0.05)
      ) {
        shouldAnnounce = true
        message = `${distanceToDestination.toFixed(1)} miles remaining to your destination.`
      }
    } else if (distanceAlertFrequency === "medium") {
      // At whole miles or specific milestones
      if (
        Math.abs(Math.round(distanceToDestination) - distanceToDestination) < 0.05 ||
        (distanceToDestination <= 3 &&
          Math.abs(Math.round(distanceToDestination * 2) / 2 - distanceToDestination) < 0.05)
      ) {
        shouldAnnounce = true
        message = `${distanceToDestination.toFixed(1)} miles remaining to your destination.`
      }
    } else if (distanceAlertFrequency === "low") {
      // Only at major milestones
      const milestones = [10, 5, 3, 2, 1, 0.5, 0.2]
      for (const milestone of milestones) {
        if (Math.abs(distanceToDestination - milestone) < 0.05) {
          shouldAnnounce = true
          message = `${milestone} ${milestone === 1 ? "mile" : "miles"} remaining to your destination.`
          break
        }
      }
    }

    if (shouldAnnounce) {
      speak(message)
      lastDistanceAlert.current = now
      lastVoiceAlert.current = "distance"
    }
  }

  // Check if we're approaching a turn and should announce it
  const checkUpcomingTurn = (position: [number, number]) => {
    if (
      !voiceEnabled ||
      !currentStep ||
      !nextStep ||
      nextStep.maneuver === "straight" ||
      nextStep.maneuver === "arrive"
    )
      return

    // Calculate distance to the next turn
    const distanceToTurn = calculateDistance(position, nextStep.coordinates)

    // Announce upcoming turns at appropriate distances
    if (distanceToTurn < 0.2 && lastVoiceAlert.current !== `upcoming_${nextStep.maneuver}`) {
      speak(`In 0.2 miles, ${nextStep.instruction}`)
      lastVoiceAlert.current = `upcoming_${nextStep.maneuver}`
    } else if (distanceToTurn < 0.5 && lastVoiceAlert.current !== `prepare_${nextStep.maneuver}`) {
      speak(`In half a mile, ${nextStep.instruction}`)
      lastVoiceAlert.current = `prepare_${nextStep.maneuver}`
    }
  }

  // Update the current navigation step based on position
  const updateNavigationStep = (position: [number, number]) => {
    if (!activeRoute || !currentStep) return

    // Find the closest point on the route to the current position
    const routePath = activeRoute.path
    let minDistance = Number.POSITIVE_INFINITY
    let closestPointIndex = 0

    for (let i = 0; i < routePath.length; i++) {
      const distance = calculateDistance(position, routePath[i])
      if (distance < minDistance) {
        minDistance = distance
        closestPointIndex = i
      }
    }

    // If we've passed the current step, move to the next one
    if (
      closestPointIndex > 0 &&
      currentStep.coordinates[0] === routePath[closestPointIndex - 1][0] &&
      currentStep.coordinates[1] === routePath[closestPointIndex - 1][1]
    ) {
      // Generate steps from the remaining route
      const remainingSteps = generateNavigationSteps(routePath.slice(closestPointIndex))

      if (remainingSteps.length > 0) {
        const newCurrentStep = remainingSteps[0]
        const newNextStep = remainingSteps.length > 1 ? remainingSteps[1] : null

        setCurrentStep(newCurrentStep)
        setNextStep(newNextStep)

        // Announce the new step with enhanced guidance
        if (voiceEnabled && newCurrentStep.instruction !== currentStep.instruction) {
          // Add a pre-announcement for turns
          if (
            newCurrentStep.maneuver &&
            newCurrentStep.maneuver !== "straight" &&
            newCurrentStep.maneuver !== "arrive"
          ) {
            const turnAlert = `In ${newCurrentStep.distance}, ${newCurrentStep.instruction}`
            speak(turnAlert)
          } else {
            speak(newCurrentStep.instruction)
          }
          lastVoiceAlert.current = newCurrentStep.instruction
        }
      }
    }
  }

  // Check if the user is off route and needs a recalculation
  const checkIfOffRoute = (position: [number, number]) => {
    if (!activeRoute) return

    // Find the closest point on the route
    const routePath = activeRoute.path
    let minDistance = Number.POSITIVE_INFINITY

    for (const point of routePath) {
      const distance = calculateDistance(position, point)
      if (distance < minDistance) {
        minDistance = distance
      }
    }

    // If more than 0.1 miles off route, suggest recalculation
    if (minDistance > 0.1) {
      if (voiceEnabled && lastVoiceAlert.current !== "off-route") {
        speak("You appear to be off route. Recalculating.")
        lastVoiceAlert.current = "off-route"
      }

      toast({
        title: "Off Route",
        description: "You appear to be off route. Recalculating...",
        action: (
          <button
            className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-xs"
            onClick={recalculateRoute}
          >
            Recalculate
          </button>
        ),
      })

      // Add notification
      addNotification({
        type: "warning",
        title: "Off Route",
        message: "You appear to be off route. Recalculating...",
        actionLabel: "Recalculate",
        actionFn: recalculateRoute,
      })

      // Auto-recalculate after a short delay
      setTimeout(() => {
        recalculateRoute()
      }, 3000)
    }
  }

  // Recalculate the route based on current position
  const recalculateRoute = async () => {
    if (!currentPosition || !destination) return

    try {
      // In a real app, we would call the routing API here
      // For this demo, we'll simulate a new route

      // Create a new origin from current position
      const newOrigin: Location = {
        name: "Current Location",
        coordinates: currentPosition,
      }

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Generate a new route
      const newRoute = simulateNewRoute(newOrigin, destination)

      // Update the active route
      setActiveRoute(newRoute)
      setOrigin(newOrigin)

      // Reset navigation state
      const steps = generateNavigationSteps(newRoute.path)
      if (steps.length > 0) {
        setCurrentStep(steps[0])
        setNextStep(steps.length > 1 ? steps[1] : null)
      }

      setRemainingDistance(newRoute.distance)
      setRemainingTime(newRoute.duration)
      setProgress(0)

      if (voiceEnabled) {
        speak(`Route recalculated. ${newRoute.distance} remaining. Estimated arrival in ${newRoute.duration}.`)
        lastVoiceAlert.current = "recalculated"
      }

      toast({
        title: "Route Recalculated",
        description: `New route found. ${newRoute.distance} remaining.`,
      })

      // Add notification
      addNotification({
        type: "info",
        title: "Route Recalculated",
        message: `New route found. ${newRoute.distance} remaining.`,
      })

      // Dispatch event to notify map component
      window.dispatchEvent(
        new CustomEvent("routeRecalculated", {
          detail: { route: newRoute, origin: newOrigin, destination },
        }),
      )

      return Promise.resolve()
    } catch (error) {
      console.error("Error recalculating route:", error)
      toast({
        title: "Recalculation Failed",
        description: "Could not find a new route. Please try again.",
        variant: "destructive",
      })

      // Add notification
      addNotification({
        type: "error",
        title: "Recalculation Failed",
        message: "Could not find a new route. Please try again.",
      })

      return Promise.reject(error)
    }
  }

  // Toggle voice guidance
  const toggleVoice = () => {
    setVoiceEnabled((prev) => !prev)

    if (!voiceEnabled) {
      speak("Voice guidance enabled.")
    }
  }

  // Speak a message using the Web Speech API
  const speak = (message: string) => {
    if (!("speechSynthesis" in window)) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(message)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    window.speechSynthesis.speak(utterance)
  }

  // Helper function to generate navigation steps from a route path
  const generateNavigationSteps = (path: [number, number][]): NavigationStep[] => {
    const detailedSteps = generateDetailedNavigationSteps(path)

    return detailedSteps.map((step) => ({
      instruction: step.instruction,
      distance: step.distance,
      coordinates: step.coordinates,
      maneuver: step.maneuver,
      bearing: step.bearing,
    }))
  }

  // Helper function to calculate distance between two points
  const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
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

  // Helper function to calculate bearing between two points
  const calculateBearing = (point1: [number, number], point2: [number, number]): number => {
    const lng1 = (point1[0] * Math.PI) / 180
    const lat1 = (point1[1] * Math.PI) / 180
    const lng2 = (point2[0] * Math.PI) / 180
    const lat2 = (point2[1] * Math.PI) / 180

    const y = Math.sin(lng2 - lng1) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1)
    const bearing = (Math.atan2(y, x) * 180) / Math.PI

    return (bearing + 360) % 360
  }

  // Helper function to get direction from bearing
  const getDirectionFromBearing = (bearing: number): string => {
    const directions = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"]
    const index = Math.round(bearing / 45) % 8
    return directions[index]
  }

  // Helper function to simulate a new route
  const simulateNewRoute = (origin: Location, destination: Location): Route => {
    // Calculate a midpoint with some variation
    const midLng = origin.coordinates[0] + (destination.coordinates[0] - origin.coordinates[0]) * 0.4
    const midLat = origin.coordinates[1] + (destination.coordinates[1] - origin.coordinates[1]) * 0.4

    // Calculate approximate distance
    const distance = calculateDistance(origin.coordinates, destination.coordinates)

    return {
      id: Math.floor(Math.random() * 1000),
      name: "Recalculated Route",
      duration: `${Math.round(distance * 2)} mins`,
      distance: `${distance.toFixed(1)} miles`,
      trafficLevel: "moderate",
      incidents: 0,
      path: [origin.coordinates, [midLng, midLat], destination.coordinates],
    }
  }

  const updateUserPosition = (position: [number, number]) => {
    setCurrentPosition(position)

    // Update navigation progress based on new position
    if (isNavigating && activeRoute) {
      updateNavigationProgress(position)
    }

    // Dispatch event to update the map
    window.dispatchEvent(
      new CustomEvent("userPositionUpdated", {
        detail: { position },
      }),
    )
  }

  const value = {
    isNavigating,
    activeRoute,
    origin,
    destination,
    currentPosition,
    currentStep,
    nextStep,
    remainingDistance,
    remainingTime,
    progress,
    is3DMode,
    toggle3DMode,
    startNavigation,
    stopNavigation,
    recalculateRoute,
    voiceEnabled,
    toggleVoice,
    distanceAlertFrequency,
    setDistanceAlertFrequency,
    updateUserPosition,
  }

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider")
  }
  return context
}

