import { Suspense } from "react"
import MapView from "@/components/map-view"
import RoutePanel from "@/components/route-panel"
import LoadingMap from "@/components/loading-map"
import { Button } from "@/components/ui/button"
import { Navigation } from "lucide-react"
import LiveLocationSharing from "@/components/live-location-sharing"
import NavigationInterface from "@/components/navigation-interface"
import { NavigationProvider } from "@/contexts/navigation-context"
import { NotificationProvider } from "@/contexts/notification-context"
import NotificationCenter from "@/components/notification-center"
import MovementSimulator from "@/components/movement-simulator"

export default function Home() {
  return (
    <NotificationProvider>
      <NavigationProvider>
        <main className="flex flex-col h-screen">
          <header className="flex items-center justify-between p-4 bg-white border-b dark:bg-gray-950 z-20">
            <div className="flex items-center gap-2">
              <Navigation className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">Route Optimizer</h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <LiveLocationSharing />
              <Button size="sm" className="hidden sm:flex">
                My Routes
              </Button>
            </div>
          </header>

          <div className="relative flex flex-1 overflow-hidden">
            <Suspense fallback={<LoadingMap />}>
              <MapView />
            </Suspense>
            <RoutePanel />
            <NavigationInterface />
            <MovementSimulator />
          </div>
        </main>
      </NavigationProvider>
    </NotificationProvider>
  )
}

