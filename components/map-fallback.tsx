import { Button } from "@/components/ui/button"
import { ExternalLink, MapPinOffIcon as MapOff } from "lucide-react"

export default function MapFallback() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-md text-center space-y-4">
        <MapOff className="h-16 w-16 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Map Cannot Be Loaded</h2>
        <p className="text-gray-700 dark:text-gray-300">
          A Mapbox access token is required to display the map. Please add your Mapbox token to the environment
          variables.
        </p>
        <div className="bg-gray-200 dark:bg-gray-800 p-4 rounded-md text-sm text-left">
          <p className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here</p>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">You can get a Mapbox token by signing up at Mapbox.</p>
        <Button variant="outline" className="gap-2" asChild>
          <a href="https://www.mapbox.com/" target="_blank" rel="noopener noreferrer">
            Visit Mapbox
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  )
}

