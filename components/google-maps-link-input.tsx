"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Link } from "lucide-react"

interface GoogleMapsLinkInputProps {
  onLocationSelect: (location: { name: string; coordinates: [number, number] }) => void
}

export default function GoogleMapsLinkInput({ onLocationSelect }: GoogleMapsLinkInputProps) {
  const [link, setLink] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!link) {
      toast({
        title: "Missing link",
        description: "Please enter a Google Maps link",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Extract coordinates from Google Maps link
      const coordinates = extractCoordinatesFromLink(link)

      if (!coordinates) {
        // If we couldn't extract coordinates directly, send to our API
        const response = await fetch(`/api/parse-maps-link?url=${encodeURIComponent(link)}`)

        if (!response.ok) {
          throw new Error("Failed to parse Google Maps link")
        }

        const data = await response.json()

        if (!data.coordinates) {
          throw new Error("Could not extract location from link")
        }

        // Get location name through reverse geocoding
        const geocodeResponse = await fetch(
          `/api/reverse-geocode?lat=${data.coordinates[1]}&lng=${data.coordinates[0]}`,
        )

        if (!geocodeResponse.ok) {
          throw new Error("Failed to get location name")
        }

        const geocodeData = await geocodeResponse.json()
        const locationName =
          geocodeData.features && geocodeData.features.length > 0
            ? geocodeData.features[0].place_name
            : "Selected Location"

        onLocationSelect({
          name: locationName,
          coordinates: data.coordinates,
        })

        toast({
          title: "Location found",
          description: `Destination set to: ${locationName}`,
        })

        // Clear the input
        setLink("")
      } else {
        // We extracted coordinates directly from the URL
        // Get location name through reverse geocoding
        const geocodeResponse = await fetch(`/api/reverse-geocode?lat=${coordinates[1]}&lng=${coordinates[0]}`)

        if (!geocodeResponse.ok) {
          throw new Error("Failed to get location name")
        }

        const geocodeData = await geocodeResponse.json()
        const locationName =
          geocodeData.features && geocodeData.features.length > 0
            ? geocodeData.features[0].place_name
            : "Selected Location"

        onLocationSelect({
          name: locationName,
          coordinates: coordinates,
        })

        toast({
          title: "Location found",
          description: `Destination set to: ${locationName}`,
        })

        // Clear the input
        setLink("")
      }
    } catch (error) {
      console.error("Error parsing Google Maps link:", error)
      toast({
        title: "Error",
        description:
          "Could not extract location from the provided link. Please make sure it's a valid Google Maps link.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Function to extract coordinates from Google Maps link
  const extractCoordinatesFromLink = (url: string): [number, number] | null => {
    try {
      // Try to match coordinates in the URL
      // Google Maps URLs can have coordinates in different formats

      // Format: https://www.google.com/maps/place/.../@lat,lng,zoom/...
      const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
      if (atMatch) {
        return [Number.parseFloat(atMatch[2]), Number.parseFloat(atMatch[1])]
      }

      // Format: https://www.google.com/maps?q=lat,lng
      const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
      if (qMatch) {
        return [Number.parseFloat(qMatch[2]), Number.parseFloat(qMatch[1])]
      }

      // Format: https://goo.gl/maps/... (short links)
      // These need to be resolved server-side

      return null
    } catch (error) {
      console.error("Error extracting coordinates:", error)
      return null
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <div className="absolute left-3 top-3 h-4 w-4 text-muted-foreground">
          <Link className="h-4 w-4" />
        </div>
        <Input
          type="text"
          placeholder="Paste Google Maps link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="pl-10"
        />
      </div>
      <Button type="submit" disabled={isLoading || !link}>
        {isLoading ? "Loading..." : "Go"}
      </Button>
    </form>
  )
}

