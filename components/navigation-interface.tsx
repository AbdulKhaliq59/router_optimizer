"use client"

import { useState } from "react"
import { useNavigation } from "@/contexts/navigation-context"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import {
  Navigation,
  MicOff,
  Mic,
  X,
  CornerDownLeft,
  Clock,
  RotateCw,
  ChevronUp,
  ChevronDown,
  Settings,
  CuboidIcon as Cube,
  Square,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  ArrowUpLeft,
  CornerRightUp,
  CornerLeftUp,
  RotateCcw,
  MapPin,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export default function NavigationInterface() {
  const {
    isNavigating,
    activeRoute,
    currentStep,
    nextStep,
    remainingDistance,
    remainingTime,
    progress,
    stopNavigation,
    recalculateRoute,
    voiceEnabled,
    toggleVoice,
    is3DMode,
    toggle3DMode,
    distanceAlertFrequency,
    setDistanceAlertFrequency,
  } = useNavigation()

  const [expanded, setExpanded] = useState(true)

  // If not navigating, don't render anything
  if (!isNavigating || !activeRoute) {
    return null
  }

  const getTurnIcon = (maneuver?: string) => {
    if (!maneuver) return <CornerDownLeft className="h-5 w-5 text-primary" />

    switch (maneuver) {
      case "right":
        return <ArrowRight className="h-5 w-5 text-primary" />
      case "left":
        return <ArrowLeft className="h-5 w-5 text-primary" />
      case "slight-right":
        return <ArrowUpRight className="h-5 w-5 text-primary" />
      case "slight-left":
        return <ArrowUpLeft className="h-5 w-5 text-primary" />
      case "sharp-right":
        return <CornerRightUp className="h-5 w-5 text-primary" />
      case "sharp-left":
        return <CornerLeftUp className="h-5 w-5 text-primary" />
      case "uturn":
        return <RotateCcw className="h-5 w-5 text-primary" />
      case "arrive":
        return <MapPin className="h-5 w-5 text-primary" />
      default:
        return <CornerDownLeft className="h-5 w-5 text-primary" />
    }
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-10 transition-all duration-300 ${expanded ? "h-auto max-h-48 sm:max-h-64" : "h-16"}`}
    >
      <Card className="rounded-b-none border-b-0 shadow-lg">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            <span className="font-medium truncate max-w-[150px] sm:max-w-none">{activeRoute.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Navigation Settings</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Voice Guidance</span>
                      <Button variant="outline" size="sm" onClick={toggleVoice} className="gap-2">
                        {voiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                        {voiceEnabled ? "Enabled" : "Disabled"}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">3D Mode</span>
                      <Button variant="outline" size="sm" onClick={toggle3DMode} className="gap-2">
                        {is3DMode ? <Square className="h-4 w-4" /> : <Cube className="h-4 w-4" />}
                        {is3DMode ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Distance Alert Frequency</h4>
                    <RadioGroup
                      value={distanceAlertFrequency}
                      onValueChange={(value) => setDistanceAlertFrequency(value as "off" | "low" | "medium" | "high")}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="off" id="off" />
                        <Label htmlFor="off">Off</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="low" id="low" />
                        <Label htmlFor="low">Low (Major milestones only)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="medium" id="medium" />
                        <Label htmlFor="medium">Medium (Every mile)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="high" id="high" />
                        <Label htmlFor="high">High (Every half mile)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleVoice}>
              {voiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={stopNavigation}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {expanded && (
          <CardContent className="p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-16rem)] sm:max-h-none">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{remainingTime} remaining</span>
              </div>
              <span className="text-sm font-medium">{remainingDistance}</span>
            </div>

            <Progress value={progress} className="h-2" />

            {currentStep && (
              <div className="bg-primary/10 p-3 rounded-md">
                <div className="flex items-start gap-2">
                  {getTurnIcon(currentStep.maneuver)}
                  <div className="flex-1">
                    <p className="font-medium">{currentStep.instruction}</p>
                    {nextStep && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="bg-background/80 p-1 rounded-full">{getTurnIcon(nextStep.maneuver)}</div>
                        <p className="text-sm text-muted-foreground">Then: {nextStep.instruction}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => recalculateRoute()}>
              <RotateCw className="h-4 w-4" />
              Recalculate Route
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

