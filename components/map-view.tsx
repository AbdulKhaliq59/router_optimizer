"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Locate, MapPin, CuboidIcon as Cube, AlertTriangle, Square } from "lucide-react"
import { useNavigation } from "@/contexts/navigation-context"
import { useNotifications } from "@/contexts/notification-context"

// Get Mapbox token from environment variables
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

interface Route {
  id: number
  name: string
  path: [number, number][]
  trafficLevel: string
}

interface Location {
  name: string
  coordinates: [number, number]
}

interface Incident {
  id: number
  type: string
  severity: string
  location: [number, number]
  description: string
}

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const userMarker = useRef<mapboxgl.Marker | null>(null)
  const clickMarker = useRef<mapboxgl.Marker | null>(null)
  const incidentMarkers = useRef<mapboxgl.Marker[]>([])
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [currentRoutes, setCurrentRoutes] = useState<Route[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null)
  const [isSelectingOnMap, setIsSelectingOnMap] = useState(false)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const { toast } = useToast()
  const { isNavigating, currentPosition, startNavigation, is3DMode, toggle3DMode } = useNavigation()
  const { addNotification } = useNotifications()
  const [activeRoute, setActiveRoute] = useState<Route | null>(null)

  // Initialize map
  useEffect(() => {
    if (map.current || !MAPBOX_TOKEN) return // Don't initialize if token is missing or map exists

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN

      map.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-74.5, 40], // Default location (New York)
        zoom: 9,
        pitch: 0, // Start with 2D view
        bearing: 0,
      })

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right")

      map.current.on("load", () => {
        setMapInitialized(true)

        // Add 3D buildings layer
        if (map.current) {
          // Add 3D buildings layer (initially hidden)
          map.current.addLayer({
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 15,
            paint: {
              "fill-extrusion-color": "#aaa",
              "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 15, 0, 15.05, ["get", "height"]],
              "fill-extrusion-base": ["interpolate", ["linear"], ["zoom"], 15, 0, 15.05, ["get", "min_height"]],
              "fill-extrusion-opacity": 0.6,
            },
            layout: {
              visibility: "none",
            },
          })

          // Add traffic data source and layer
          map.current.addSource("traffic", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [
                // Example traffic congestion line
                {
                  type: "Feature",
                  properties: { congestion: "high" },
                  geometry: {
                    type: "LineString",
                    coordinates: [
                      [-74.5, 40],
                      [-74.45, 40.05],
                      [-74.4, 40.1],
                    ],
                  },
                },
              ],
            },
          })

          // Add a layer to visualize the traffic
          map.current.addLayer({
            id: "traffic-layer",
            type: "line",
            source: "traffic",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": [
                "match",
                ["get", "congestion"],
                "high",
                "#FF0000",
                "medium",
                "#FFFF00",
                "low",
                "#00FF00",
                "#CCCCCC", // default color
              ],
              "line-width": 8,
              "line-opacity": 0.8,
            },
          })

          // Add empty sources and layers for routes
          map.current.addSource("routes", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [],
            },
          })

          map.current.addLayer({
            id: "routes-layer",
            type: "line",
            source: "routes",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": [
                "match",
                ["get", "trafficLevel"],
                "high",
                "#FF0000",
                "moderate",
                "#FFA500",
                "light",
                "#00FF00",
                "#3887be", // default color
              ],
              "line-width": 5,
              "line-opacity": ["case", ["==", ["get", "selected"], true], 1, 0.7],
            },
          })

          // Add empty sources and layers for markers
          map.current.addSource("markers", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [],
            },
          })

          map.current.addLayer({
            id: "markers-layer",
            type: "circle",
            source: "markers",
            paint: {
              "circle-radius": 8,
              "circle-color": [
                "match",
                ["get", "type"],
                "origin",
                "#00FF00",
                "destination",
                "#FF0000",
                "#3887be", // default color
              ],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#FFFFFF",
            },
          })

          // Add source and layer for navigation path
          map.current.addSource("navigation", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [],
            },
          })

          map.current.addLayer({
            id: "navigation-layer",
            type: "line",
            source: "navigation",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": [
                "match",
                ["get", "status"],
                "completed",
                "#4CAF50", // Green for completed segments
                "#3887be", // Blue for remaining segments
              ],
              "line-width": 6,
              "line-opacity": 0.8,
            },
          })

          // Add source and layer for incidents
          map.current.addSource("incidents", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [],
            },
          })

          map.current.addLayer({
            id: "incidents-layer",
            type: "circle",
            source: "incidents",
            paint: {
              "circle-radius": 10,
              "circle-color": [
                "match",
                ["get", "severity"],
                "high",
                "#FF0000",
                "medium",
                "#FFA500",
                "low",
                "#FFFF00",
                "#FF0000", // default color
              ],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#FFFFFF",
              "circle-opacity": 0.8,
            },
          })

          // Add click handler for map
          map.current.on("click", handleMapClick)

          // Fetch incidents
          fetchIncidents()
        }
      })

      // Handle map errors
      map.current.on("error", (e) => {
        console.error("Mapbox error:", e)
        setMapError(true)
        toast({
          title: "Map Error",
          description: "There was an error loading the map. Please check your Mapbox token.",
          variant: "destructive",
        })
      })
    } catch (error) {
      console.error("Error initializing map:", error)
      setMapError(true)
      toast({
        title: "Map Error",
        description: "Failed to initialize the map. Please check your Mapbox token.",
        variant: "destructive",
      })
    }

    // Clean up on unmount
    return () => {
      map.current?.remove()
    }
  }, [toast])

  // Fetch incidents from API
  const fetchIncidents = async () => {
    try {
      const response = await fetch("/api/reports")
      if (!response.ok) {
        throw new Error("Failed to fetch incidents")
      }

      const data = await response.json()
      setIncidents(data.reports)

      // Update incidents on map
      updateIncidentsOnMap(data.reports)
    } catch (error) {
      console.error("Error fetching incidents:", error)
    }
  }

  // Update incidents on map
  const updateIncidentsOnMap = (incidents: Incident[]) => {
    if (!map.current || !mapInitialized) return

    // Clear existing incident markers
    incidentMarkers.current.forEach((marker) => marker.remove())
    incidentMarkers.current = []

    // Create GeoJSON features for incidents
    const incidentFeatures = incidents.map((incident) => ({
      type: "Feature",
      properties: {
        id: incident.id,
        type: incident.type,
        severity: incident.severity,
        description: incident.description,
      },
      geometry: {
        type: "Point",
        coordinates: incident.location,
      },
    }))

    // Update source
    if (map.current.getSource("incidents")) {
      ;(map.current.getSource("incidents") as mapboxgl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: incidentFeatures as any,
      })
    }

    // Create markers for incidents
    incidents.forEach((incident) => {
      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div>
          <h3 class="font-bold">${incident.type}</h3>
          <p class="text-sm">${incident.description}</p>
          <p class="text-xs mt-1">Severity: ${incident.severity}</p>
        </div>
      `)

      // Create marker
      const el = document.createElement("div")
      el.className = "flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-lg"

      const inner = document.createElement("div")
      inner.className = `w-6 h-6 rounded-full flex items-center justify-center ${
        incident.severity === "high" ? "bg-red-500" : incident.severity === "medium" ? "bg-orange-500" : "bg-yellow-500"
      }`

      const icon = document.createElement("span")
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="text-white"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`

      inner.appendChild(icon)
      el.appendChild(inner)

      // Add pulse effect for high severity
      if (incident.severity === "high") {
        const pulse = document.createElement("div")
        pulse.className = "absolute inset-0 rounded-full bg-red-500 animate-pulse-ring"
        el.appendChild(pulse)
      }

      const marker = new mapboxgl.Marker(el).setLngLat(incident.location).setPopup(popup).addTo(map.current!)

      incidentMarkers.current.push(marker)
    })
  }

  // Handle map click for destination selection
  const handleMapClick = async (e: mapboxgl.MapMouseEvent) => {
    if (!isSelectingOnMap || !map.current || isNavigating) return

    const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat]

    // Add or update marker
    if (clickMarker.current) {
      clickMarker.current.setLngLat(coordinates)
    } else {
      clickMarker.current = new mapboxgl.Marker({ color: "#FF0000" }).setLngLat(coordinates).addTo(map.current)
    }

    try {
      // Reverse geocode to get the address
      const response = await fetch(`/api/reverse-geocode?lat=${coordinates[1]}&lng=${coordinates[0]}`)

      if (!response.ok) {
        throw new Error("Failed to reverse geocode location")
      }

      const data = await response.json()
      const locationName = data.features && data.features.length > 0 ? data.features[0].place_name : "Selected Location"

      // Dispatch event to set the destination
      window.dispatchEvent(
        new CustomEvent("mapDestinationSelected", {
          detail: {
            location: {
              name: locationName,
              coordinates,
            },
          },
        }),
      )

      toast({
        title: "Destination Selected",
        description: `Destination set to: ${locationName}`,
      })

      // Turn off selection mode
      setIsSelectingOnMap(false)
    } catch (error) {
      console.error("Error reverse geocoding:", error)
      toast({
        title: "Error",
        description: "Failed to get location information. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Listen for routes calculated event
  useEffect(() => {
    const handleRoutesCalculated = (event: CustomEvent) => {
      const { routes, origin, destination } = event.detail
      setCurrentRoutes(routes)
      updateMapWithRoutes(routes, origin, destination)
    }

    const handleRouteSelected = (event: CustomEvent) => {
      const { routeId } = event.detail
      setSelectedRouteId(routeId)
      highlightSelectedRoute(routeId)

      // Find the selected route
      const selectedRoute = currentRoutes.find((route) => route.id === routeId)
      if (selectedRoute && map.current) {
        // Get the origin and destination from the markers source
        const markersSource = map.current.getSource("markers") as mapboxgl.GeoJSONSource
        const markersData = markersSource._data as any

        if (markersData && markersData.features && markersData.features.length >= 2) {
          const originFeature = markersData.features.find((f: any) => f.properties.type === "origin")
          const destFeature = markersData.features.find((f: any) => f.properties.type === "destination")

          if (originFeature && destFeature) {
            const origin = {
              name: originFeature.properties.name,
              coordinates: originFeature.geometry.coordinates,
            }

            const destination = {
              name: destFeature.properties.name,
              coordinates: destFeature.geometry.coordinates,
            }

            // Start navigation with the selected route
            startNavigation(selectedRoute, origin, destination)
          }
        }
      }
    }

    const handleNavigationStarted = (event: CustomEvent) => {
      const { route, origin, destination } = event.detail

      // Update the navigation layer
      if (map.current) {
        const navigationSource = map.current.getSource("navigation") as mapboxgl.GeoJSONSource

        navigationSource.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: route.path,
              },
            },
          ],
        })

        // Hide the routes layer
        map.current.setLayoutProperty("routes-layer", "visibility", "none")

        // Create a user location marker if it doesn't exist
        if (!userMarker.current && userLocation) {
          // Create a custom marker element with pulsing effect
          const el = document.createElement("div")
          el.className = "relative"

          const markerDot = document.createElement("div")
          markerDot.className = "w-6 h-6 bg-primary rounded-full flex items-center justify-center z-10 relative"
          markerDot.innerHTML = '<div class="w-3 h-3 bg-white rounded-full"></div>'

          const pulseRing = document.createElement("div")
          pulseRing.className = "absolute top-0 left-0 w-6 h-6 bg-primary rounded-full pulse-ring"

          el.appendChild(pulseRing)
          el.appendChild(markerDot)

          userMarker.current = new mapboxgl.Marker({ element: el }).setLngLat(userLocation).addTo(map.current)
        }

        // If 3D mode is enabled, adjust the camera
        if (is3DMode) {
          map.current.easeTo({
            pitch: 60,
            bearing: calculateBearing(route.path[0], route.path[1]),
            duration: 1000,
          })
        }

        setActiveRoute(route)
      }
    }

    const handleNavigationStopped = () => {
      // Show the routes layer again
      if (map.current) {
        map.current.setLayoutProperty("routes-layer", "visibility", "visible")

        // Clear the navigation layer
        const navigationSource = map.current.getSource("navigation") as mapboxgl.GeoJSONSource
        navigationSource.setData({
          type: "FeatureCollection",
          features: [],
        })

        // Reset pitch and bearing if in 3D mode
        if (is3DMode && map.current) {
          map.current.easeTo({
            pitch: 60,
            bearing: 0,
            duration: 1000,
          })
        }

        setActiveRoute(null)
      }
    }

    const handleNavigationUpdated = (event: CustomEvent) => {
      const { position } = event.detail

      // Update the user marker position
      if (map.current && userMarker.current) {
        userMarker.current.setLngLat(position)

        // If in 3D mode, follow the user with the camera
        if (is3DMode && isNavigating) {
          // Find the next point in the route to calculate bearing
          const navigationSource = map.current.getSource("navigation") as mapboxgl.GeoJSONSource
          const navigationData = navigationSource._data as any

          if (navigationData && navigationData.features && navigationData.features.length > 0) {
            const routePath = navigationData.features[0].geometry.coordinates

            // Find the next point in the route
            let nextPointIndex = 0
            let minDistance = Number.POSITIVE_INFINITY

            for (let i = 0; i < routePath.length; i++) {
              const distance = calculateDistance(position, routePath[i])
              if (distance < minDistance) {
                minDistance = distance
                nextPointIndex = i
              }
            }

            // Get the next point to look towards
            const nextPoint = routePath[Math.min(nextPointIndex + 1, routePath.length - 1)]
            const bearing = calculateBearing(position, nextPoint)

            // Update camera to follow user in 3D
            map.current.easeTo({
              center: position,
              pitch: 60,
              bearing: bearing,
              duration: 1000,
            })
          }
        }

        // Update the route progress visualization
        updateRouteProgress(position)
      }
    }

    const handleRouteRecalculated = (event: CustomEvent) => {
      const { route } = event.detail

      // Update the navigation layer
      if (map.current) {
        const navigationSource = map.current.getSource("navigation") as mapboxgl.GeoJSONSource

        navigationSource.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: route.path,
              },
            },
          ],
        })

        // Fit the map to the new route
        const bounds = new mapboxgl.LngLatBounds()
        route.path.forEach((coord) => {
          bounds.extend(coord as mapboxgl.LngLatLike)
        })

        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15,
        })

        setActiveRoute(route)
      }
    }

    const handleSelectDestinationOnMap = () => {
      setIsSelectingOnMap(true)

      toast({
        title: "Select Destination",
        description: "Click anywhere on the map to set your destination",
      })
    }

    const handleToggle3DMode = (event: CustomEvent) => {
      const { is3DMode } = event.detail

      if (map.current) {
        // Toggle 3D buildings layer
        map.current.setLayoutProperty("3d-buildings", "visibility", is3DMode ? "visible" : "none")

        // Adjust pitch and bearing
        map.current.easeTo({
          pitch: is3DMode ? 60 : 0,
          bearing: is3DMode ? 30 : 0,
          duration: 1000,
        })
      }
    }

    const handleIncidentReported = (event: CustomEvent) => {
      // Refresh incidents when a new one is reported
      fetchIncidents()

      const { incident } = event.detail

      // Add notification for nearby incidents
      if (currentPosition) {
        const distance = calculateDistance(currentPosition, incident.location)

        // If incident is within 5 miles of current position
        if (distance < 5) {
          addNotification({
            type: "incident",
            title: `Nearby ${incident.type}`,
            message: `${incident.description} (${distance.toFixed(1)} miles away)`,
            location: incident.location,
            actionLabel: "View on map",
            actionFn: () => {
              if (map.current) {
                map.current.flyTo({
                  center: incident.location,
                  zoom: 15,
                  essential: true,
                })
              }
            },
          })
        }
      }
    }

    const handleUserPositionUpdated = (event: CustomEvent) => {
      const { position } = event.detail

      // Update the user marker position
      if (map.current && userMarker.current) {
        userMarker.current.setLngLat(position)

        // If in navigation mode, center the map on the user
        if (isNavigating) {
          // In 3D mode, we already handle camera in navigationUpdated event
          if (!is3DMode) {
            map.current.easeTo({
              center: position,
              duration: 500,
            })
          }
        }
      }
    }

    window.addEventListener("routesCalculated", handleRoutesCalculated as EventListener)
    window.addEventListener("routeSelected", handleRouteSelected as EventListener)
    window.addEventListener("navigationStarted", handleNavigationStarted as EventListener)
    window.addEventListener("navigationStopped", handleNavigationStopped as EventListener)
    window.addEventListener("navigationUpdated", handleNavigationUpdated as EventListener)
    window.addEventListener("routeRecalculated", handleRouteRecalculated as EventListener)
    window.addEventListener("selectDestinationOnMap", handleSelectDestinationOnMap as EventListener)
    window.addEventListener("toggle3DMode", handleToggle3DMode as EventListener)
    window.addEventListener("incidentReported", handleIncidentReported as EventListener)
    window.addEventListener("userPositionUpdated", handleUserPositionUpdated as EventListener)

    return () => {
      window.removeEventListener("routesCalculated", handleRoutesCalculated as EventListener)
      window.removeEventListener("routeSelected", handleRouteSelected as EventListener)
      window.removeEventListener("navigationStarted", handleNavigationStarted as EventListener)
      window.removeEventListener("navigationStopped", handleNavigationStopped as EventListener)
      window.removeEventListener("navigationUpdated", handleNavigationUpdated as EventListener)
      window.removeEventListener("routeRecalculated", handleRouteRecalculated as EventListener)
      window.removeEventListener("selectDestinationOnMap", handleSelectDestinationOnMap as EventListener)
      window.removeEventListener("toggle3DMode", handleToggle3DMode as EventListener)
      window.removeEventListener("incidentReported", handleIncidentReported as EventListener)
      window.removeEventListener("userPositionUpdated", handleUserPositionUpdated as EventListener)
    }
  }, [
    currentRoutes,
    userLocation,
    startNavigation,
    isSelectingOnMap,
    isNavigating,
    is3DMode,
    addNotification,
    currentPosition,
  ])

  // Update user marker when current position changes
  useEffect(() => {
    if (map.current && userMarker.current && currentPosition) {
      userMarker.current.setLngLat(currentPosition)
    }
  }, [currentPosition])

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

  // Update map with routes
  const updateMapWithRoutes = (routes: Route[], origin: Location, destination: Location) => {
    if (!map.current || !mapInitialized) return

    // Create GeoJSON features for routes
    const routeFeatures = routes.map((route) => ({
      type: "Feature",
      properties: {
        id: route.id,
        name: route.name,
        trafficLevel: route.trafficLevel,
        selected: route.id === selectedRouteId,
      },
      geometry: {
        type: "LineString",
        coordinates: route.path,
      },
    }))

    // Create GeoJSON features for markers
    const markerFeatures = [
      {
        type: "Feature",
        properties: {
          type: "origin",
          name: origin.name,
        },
        geometry: {
          type: "Point",
          coordinates: origin.coordinates,
        },
      },
      {
        type: "Feature",
        properties: {
          type: "destination",
          name: destination.name,
        },
        geometry: {
          type: "Point",
          coordinates: destination.coordinates,
        },
      },
    ]

    // Update sources
    if (map.current.getSource("routes")) {
      ;(map.current.getSource("routes") as mapboxgl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: routeFeatures as any,
      })
    }

    if (map.current.getSource("markers")) {
      ;(map.current.getSource("markers") as mapboxgl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: markerFeatures as any,
      })
    }

    // Fit map to show all routes
    const bounds = new mapboxgl.LngLatBounds()
    routes.forEach((route) => {
      route.path.forEach((coord) => {
        bounds.extend(coord as mapboxgl.LngLatLike)
      })
    })

    map.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 15,
    })
  }

  const updateRouteProgress = (position: [number, number]) => {
    if (!map.current || !mapInitialized || !activeRoute) return

    const routePath = activeRoute.path

    // Find the closest point on the route to the current position
    let closestPointIndex = 0
    let minDistance = Number.POSITIVE_INFINITY

    for (let i = 0; i < routePath.length; i++) {
      const distance = calculateDistance(position, routePath[i])
      if (distance < minDistance) {
        minDistance = distance
        closestPointIndex = i
      }
    }

    // Split the route into completed and remaining segments
    const completedPath = routePath.slice(0, closestPointIndex + 1)
    if (completedPath.length > 0) {
      // Add the current position as the last point of the completed path
      completedPath.push(position)
    }

    const remainingPath = [position, ...routePath.slice(closestPointIndex + 1)]

    // Update the navigation layer to show progress
    if (map.current.getSource("navigation")) {
      ;(map.current.getSource("navigation") as mapboxgl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { status: "completed" },
            geometry: {
              type: "LineString",
              coordinates: completedPath,
            },
          },
          {
            type: "Feature",
            properties: { status: "remaining" },
            geometry: {
              type: "LineString",
              coordinates: remainingPath,
            },
          },
        ],
      })
    }
  }

  // Highlight selected route
  const highlightSelectedRoute = (routeId: number) => {
    if (!map.current || !mapInitialized) return

    const source = map.current.getSource("routes") as mapboxgl.GeoJSONSource
    if (!source) return

    const data = source._data as any
    if (!data || !data.features) return

    // Update the 'selected' property for each feature
    const updatedFeatures = data.features.map((feature: any) => ({
      ...feature,
      properties: {
        ...feature.properties,
        selected: feature.properties.id === routeId,
      },
    }))

    // Update the source data
    source.setData({
      type: "FeatureCollection",
      features: updatedFeatures,
    })
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Locating...",
      description: "Finding your current location",
    })

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const newPosition: [number, number] = [longitude, latitude]
        setUserLocation(newPosition)

        if (map.current) {
          map.current.flyTo({
            center: newPosition,
            zoom: 14,
            essential: true,
          })

          // Create or update user marker
          if (userMarker.current) {
            userMarker.current.setLngLat(newPosition)
          } else {
            // Create a custom marker element with pulsing effect
            const el = document.createElement("div")
            el.className = "relative"

            const markerDot = document.createElement("div")
            markerDot.className = "w-6 h-6 bg-primary rounded-full flex items-center justify-center z-10 relative"
            markerDot.innerHTML = '<div class="w-3 h-3 bg-white rounded-full"></div>'

            const pulseRing = document.createElement("div")
            pulseRing.className = "absolute top-0 left-0 w-6 h-6 bg-primary rounded-full pulse-ring"

            el.appendChild(pulseRing)
            el.appendChild(markerDot)

            userMarker.current = new mapboxgl.Marker({ element: el }).setLngLat(newPosition).addTo(map.current)
          }
        }

        toast({
          title: "Location found",
          description: "Map centered to your current location",
        })
      },
      (error) => {
        toast({
          title: "Error",
          description: `Failed to get location: ${error.message}`,
          variant: "destructive",
        })
      },
    )
  }

  // Add a fallback UI when Mapbox token is missing or there's an error
  if (!MAPBOX_TOKEN || mapError) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-900 p-6">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Map Cannot Be Loaded</h2>
          <p className="text-gray-700 dark:text-gray-300">
            {!MAPBOX_TOKEN
              ? "A Mapbox access token is required to display the map. Please add your Mapbox token to the environment variables."
              : "There was an error loading the map. Please check your Mapbox token and try again."}
          </p>
          <div className="bg-gray-200 dark:bg-gray-800 p-4 rounded-md text-sm text-left">
            <p className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here</p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You can get a Mapbox token by signing up at{" "}
            <a
              href="https://www.mapbox.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline"
            >
              mapbox.com
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <Button onClick={getCurrentLocation} variant="default" size="icon" className="h-12 w-12 rounded-full shadow-lg">
          <Locate className="h-6 w-6" />
        </Button>

        <Button
          onClick={toggle3DMode}
          variant={is3DMode ? "destructive" : "default"}
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
        >
          {is3DMode ? <Square className="h-6 w-6" /> : <Cube className="h-6 w-6" />}
        </Button>

        {!isNavigating && (
          <Button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("selectDestinationOnMap"))
            }}
            variant={isSelectingOnMap ? "destructive" : "default"}
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg"
          >
            <MapPin className="h-6 w-6" />
          </Button>
        )}

        <Button
          onClick={() => {
            window.dispatchEvent(new CustomEvent("openReportIncident"))
          }}
          variant="default"
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        >
          <AlertTriangle className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}

