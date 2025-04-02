"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Home, Building, RotateCw, Clock, AlertTriangle, Car, Save, ChevronLeft, ChevronRight } from "lucide-react"
import ReportIncident from "@/components/report-incident"
import LocationAutocomplete from "@/components/location-autocomplete"
import GoogleMapsLinkInput from "@/components/google-maps-link-input"
import { useToast } from "@/components/ui/use-toast"
import { useNavigation } from "@/contexts/navigation-context"

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

export default function RoutePanel() {
  const [originText, setOriginText] = useState("")
  const [destinationText, setDestinationText] = useState("")
  const [origin, setOrigin] = useState<Location | null>(null)
  const [destination, setDestination] = useState<Location | null>(null)
  const [routes, setRoutes] = useState<Route[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const { toast } = useToast()
  const { isNavigating } = useNavigation()
  const [incidents, setIncidents] = useState<any[]>([])
  const [isIncidentsLoading, setIsIncidentsLoading] = useState(false)
  const map = useRef<any>(null)

  const fetchIncidents = async () => {
    setIsIncidentsLoading(true)
    try {
      const response = await fetch("/api/reports")
      if (!response.ok) {
        throw new Error("Failed to fetch incidents")
      }
      const data = await response.json()
      setIncidents(data.reports)
    } catch (error) {
      console.error("Error fetching incidents:", error)
      toast({
        title: "Error",
        description: "Failed to fetch traffic reports",
        variant: "destructive",
      })
    } finally {
      setIsIncidentsLoading(false)
    }
  }

  // Calculate routes when both origin and destination are set
  useEffect(() => {
    if (origin && destination) {
      calculateRoutes()
    }
  }, [origin, destination])

  // Listen for map destination selection
  useEffect(() => {
    const handleMapDestinationSelected = (event: CustomEvent) => {
      const { location } = event.detail
      setDestination(location)
      setDestinationText(location.name)
    }

    window.addEventListener("mapDestinationSelected", handleMapDestinationSelected as EventListener)

    return () => {
      window.removeEventListener("mapDestinationSelected", handleMapDestinationSelected as EventListener)
    }
  }, [])

  useEffect(() => {
    fetchIncidents()

    // Listen for incident reported events
    const handleIncidentReported = () => {
      fetchIncidents()
    }

    window.addEventListener("incidentReported", handleIncidentReported as EventListener)

    return () => {
      window.removeEventListener("incidentReported", handleIncidentReported as EventListener)
    }
  }, [])

  const calculateRoutes = async () => {
    if (!origin || !destination) {
      toast({
        title: "Missing locations",
        description: "Please select both origin and destination",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ origin, destination }),
      })

      if (!response.ok) {
        throw new Error("Failed to calculate routes")
      }

      const data = await response.json()
      setRoutes(data.routes)

      // Dispatch a custom event to notify the map component
      window.dispatchEvent(
        new CustomEvent("routesCalculated", {
          detail: { routes: data.routes, origin, destination },
        }),
      )
    } catch (error) {
      console.error("Error calculating routes:", error)
      toast({
        title: "Error",
        description: "Failed to calculate routes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOriginSelect = (location: Location) => {
    setOrigin(location)
    setOriginText(location.name)
  }

  const handleDestinationSelect = (location: Location) => {
    setDestination(location)
    setDestinationText(location.name)
  }

  // If we're navigating, hide the route panel
  if (isNavigating) {
    return null
  }

  // If panel is collapsed on mobile, show only the toggle button
  if (isPanelCollapsed) {
    return (
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="default"
          size="icon"
          className="h-10 w-10 rounded-full shadow-lg"
          onClick={() => setIsPanelCollapsed(false)}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="absolute top-0 left-0 w-full sm:w-96 h-auto sm:h-full p-4 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm overflow-auto">
      <div className="flex justify-between items-center mb-2 sm:hidden">
        <h2 className="font-medium">Route Planner</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsPanelCollapsed(true)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      <Tabs defaultValue="routes">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="reports">Traffic Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="space-y-4 mt-4">
          <div className="space-y-2">
            <LocationAutocomplete
              placeholder="Starting point"
              value={originText}
              onChange={setOriginText}
              onLocationSelect={handleOriginSelect}
              icon={<Home />}
              useCurrentLocation={true}
            />

            <LocationAutocomplete
              placeholder="Destination"
              value={destinationText}
              onChange={setDestinationText}
              onLocationSelect={handleDestinationSelect}
              icon={<Building />}
            />

            <div className="text-xs text-muted-foreground mt-1 mb-2">Or select destination by clicking on the map</div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Paste Google Maps Link</div>
              <GoogleMapsLinkInput onLocationSelect={handleDestinationSelect} />
            </div>

            <Button
              className="w-full gap-2 mt-4"
              onClick={calculateRoutes}
              disabled={isLoading || !origin || !destination}
            >
              {isLoading ? (
                <>Calculating...</>
              ) : (
                <>
                  <RotateCw className="h-4 w-4" />
                  Find Optimal Routes
                </>
              )}
            </Button>
          </div>

          <div className="space-y-3">
            {routes.length > 0 && <h3 className="font-medium">Suggested Routes</h3>}

            {routes.map((route) => (
              <Card key={route.id} className="border border-muted">
                <CardHeader className="p-3 pb-0">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">{route.name}</CardTitle>
                    <Badge variant={route.trafficLevel === "light" ? "outline" : "secondary"}>
                      {route.trafficLevel} traffic
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {route.duration} ({route.distance})
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3">
                  {route.incidents > 0 && (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 text-sm mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{route.incidents} incident reported</span>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Via {origin?.name} to {destination?.name}
                  </div>
                </CardContent>
                <CardFooter className="p-3 pt-0 flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => {
                      // Dispatch event to highlight this route on the map
                      window.dispatchEvent(
                        new CustomEvent("routeSelected", {
                          detail: { routeId: route.id },
                        }),
                      )
                    }}
                  >
                    <Car className="h-4 w-4" />
                    Start
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </CardFooter>
              </Card>
            ))}

            {routes.length === 0 && origin && destination && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Enter your starting point and destination to see routes</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <div className="space-y-4">
            <h3 className="font-medium">Recent Traffic Reports</h3>

            {isIncidentsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : incidents.length > 0 ? (
              <div className="space-y-3">
                {incidents.map((incident) => (
                  <Card key={incident.id}>
                    <CardHeader className="p-3 pb-0">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base capitalize">{incident.type}</CardTitle>
                        <Badge
                          variant={
                            incident.severity === "high"
                              ? "destructive"
                              : incident.severity === "medium"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)} Impact
                        </Badge>
                      </div>
                      <CardDescription>
                        {new Date(incident.reportedAt).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3">
                      <p className="text-sm">{incident.description}</p>
                    </CardContent>
                    <CardFooter className="p-3 pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          // TODO: Fix map reference
                          // if (map.current) {
                          //   map.current.flyTo({
                          //     center: incident.location,
                          //     zoom: 15,
                          //     essential: true,
                          //   })
                          // }
                        }}
                      >
                        View on Map
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No incidents reported yet</p>
              </div>
            )}

            <ReportIncident />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

