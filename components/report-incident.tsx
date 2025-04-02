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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { AlertTriangle } from "lucide-react"
import { useNavigation } from "@/contexts/navigation-context"
import { useNotifications } from "@/contexts/notification-context"

export default function ReportIncident() {
  const [type, setType] = useState("")
  const [severity, setSeverity] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  const { currentPosition } = useNavigation()
  const { addNotification } = useNotifications()

  // Listen for openReportIncident event
  useEffect(() => {
    const handleOpenReportIncident = () => {
      setIsOpen(true)
    }

    window.addEventListener("openReportIncident", handleOpenReportIncident)

    return () => {
      window.removeEventListener("openReportIncident", handleOpenReportIncident)
    }
  }, [])

  const handleSubmit = async () => {
    if (!type || !severity || !description) {
      toast({
        title: "Missing information",
        description: "Please fill out all required fields",
        variant: "destructive",
      })
      return
    }

    if (!currentPosition) {
      toast({
        title: "Location required",
        description: "We need your current location to report an incident",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Use the current user location
      const location = currentPosition

      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          severity,
          location,
          description,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit report")
      }

      const data = await response.json()

      toast({
        title: "Report submitted",
        description: "Thank you for reporting this incident",
      })

      // Add notification
      addNotification({
        type: "success",
        title: "Incident Report Submitted",
        message: "Thank you for helping other drivers by reporting this incident.",
      })

      // Dispatch event to notify map component
      window.dispatchEvent(
        new CustomEvent("incidentReported", {
          detail: {
            incident: {
              id: data.report.id,
              type,
              severity,
              location,
              description,
            },
          },
        }),
      )

      // Reset form and close dialog
      setType("")
      setSeverity("")
      setDescription("")
      setIsOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2">
          <AlertTriangle className="h-4 w-4" />
          Report New Incident
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report Traffic Incident</DialogTitle>
          <DialogDescription>Help other drivers by reporting traffic incidents in your area.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="type" className="text-sm font-medium">
              Incident Type
            </label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select incident type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accident">Accident</SelectItem>
                <SelectItem value="construction">Construction</SelectItem>
                <SelectItem value="closure">Road Closure</SelectItem>
                <SelectItem value="hazard">Road Hazard</SelectItem>
                <SelectItem value="congestion">Heavy Traffic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="severity" className="text-sm font-medium">
              Severity
            </label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger id="severity">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Impact</SelectItem>
                <SelectItem value="medium">Medium Impact</SelectItem>
                <SelectItem value="high">High Impact</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              placeholder="Provide details about the incident"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {!currentPosition && (
            <div className="text-sm text-destructive">
              Your location is required to report an incident. Please enable location services.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting || !currentPosition}>
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

