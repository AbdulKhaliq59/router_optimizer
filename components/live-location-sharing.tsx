"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { MapPin, Copy, Clock } from "lucide-react"

export default function LiveLocationSharing() {
  const [isSharing, setIsSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [duration, setDuration] = useState(30) // minutes
  const [remainingTime, setRemainingTime] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isSharing && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            stopSharing()
            return 0
          }
          return prev - 1
        })
      }, 60000) // Update every minute
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isSharing, remainingTime])

  const startSharing = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      })
      return
    }

    // In a real app, we would create a unique sharing ID and start sending location updates to the server
    const sharingId = Math.random().toString(36).substring(2, 10)
    const url = `${window.location.origin}/share/${sharingId}`

    setShareUrl(url)
    setRemainingTime(duration)
    setIsSharing(true)

    toast({
      title: "Location sharing started",
      description: `Your location will be shared for ${duration} minutes`,
    })
  }

  const stopSharing = () => {
    // In a real app, we would stop sending location updates to the server
    setIsSharing(false)
    setShareUrl("")
    setRemainingTime(0)

    toast({
      title: "Location sharing stopped",
      description: "Your location is no longer being shared",
    })
  }

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl)
    toast({
      title: "Link copied",
      description: "Share link copied to clipboard",
    })
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    if (hours > 0) {
      return `${hours}h ${mins}m`
    }

    return `${mins}m`
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <MapPin className="w-4 h-4" />
          Share Location
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Your Live Location</DialogTitle>
          <DialogDescription>
            Share your real-time location with friends or family for a limited time.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!isSharing ? (
            <div className="grid gap-2">
              <label htmlFor="duration" className="text-sm font-medium">
                Share Duration (minutes)
              </label>
              <Input
                id="duration"
                type="number"
                min="5"
                max="240"
                value={duration}
                onChange={(e) => setDuration(Number.parseInt(e.target.value) || 30)}
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Time remaining:</span>
                </div>
                <span className="text-sm font-bold">{formatTime(remainingTime)}</span>
              </div>

              <div className="grid gap-2">
                <label htmlFor="share-link" className="text-sm font-medium">
                  Share this link
                </label>
                <div className="flex gap-2">
                  <Input id="share-link" value={shareUrl} readOnly />
                  <Button variant="outline" size="icon" onClick={copyShareUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          {!isSharing ? (
            <Button onClick={startSharing}>Start Sharing</Button>
          ) : (
            <Button variant="destructive" onClick={stopSharing}>
              Stop Sharing
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

