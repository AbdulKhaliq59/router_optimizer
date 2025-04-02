"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, MapPin, X } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface LocationAutocompleteProps {
  placeholder: string
  value: string
  onChange: (value: string) => void
  onLocationSelect: (location: { name: string; coordinates: [number, number] }) => void
  icon?: React.ReactNode
  useCurrentLocation?: boolean
}

export default function LocationAutocomplete({
  placeholder,
  value,
  onChange,
  onLocationSelect,
  icon,
  useCurrentLocation = false,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false)
  const debouncedValue = useDebounce(value, 500)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch suggestions when input value changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedValue || debouncedValue.length < 2) {
        setSuggestions([])
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/geocode?query=${encodeURIComponent(debouncedValue)}`)
        const data = await response.json()

        if (data.features) {
          setSuggestions(data.features)
          setShowSuggestions(true)
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSuggestions()
  }, [debouncedValue])

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSuggestionClick = (suggestion: any) => {
    const placeName = suggestion.place_name || suggestion.text
    const coordinates = suggestion.center || [0, 0]

    onChange(placeName)
    onLocationSelect({ name: placeName, coordinates: coordinates as [number, number] })
    setShowSuggestions(false)
  }

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser")
      return
    }

    setCurrentLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        try {
          // Reverse geocode to get the address
          const response = await fetch(`/api/reverse-geocode?lat=${latitude}&lng=${longitude}`)
          const data = await response.json()

          const locationName =
            data.features && data.features.length > 0 ? data.features[0].place_name : "Current Location"

          onChange(locationName)
          onLocationSelect({ name: locationName, coordinates: [longitude, latitude] })
        } catch (error) {
          console.error("Error reverse geocoding:", error)
          onChange("Current Location")
          onLocationSelect({ name: "Current Location", coordinates: [longitude, latitude] })
        } finally {
          setCurrentLocationLoading(false)
        }
      },
      (error) => {
        console.error("Error getting location:", error)
        alert(`Error getting your location: ${error.message}`)
        setCurrentLocationLoading(false)
      },
    )
  }

  const clearInput = () => {
    onChange("")
    setSuggestions([])
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex">
        {icon && <div className="absolute left-3 top-3 h-4 w-4 text-muted-foreground">{icon}</div>}
        <Input
          placeholder={placeholder}
          className={icon ? "pl-10 pr-10" : "pr-10"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => value && setSuggestions.length > 0 && setShowSuggestions(true)}
        />
        {value && (
          <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10" onClick={clearInput}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {useCurrentLocation && (
        <Button
          variant="outline"
          size="sm"
          className="mt-1 w-full justify-start gap-2 text-sm"
          onClick={handleCurrentLocation}
          disabled={currentLocationLoading}
        >
          {currentLocationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          Use current location
        </Button>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg">
          <ul className="py-1 text-sm">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="cursor-pointer px-4 py-2 hover:bg-muted"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{suggestion.place_name || suggestion.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isLoading && (
        <div className="absolute right-3 top-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

