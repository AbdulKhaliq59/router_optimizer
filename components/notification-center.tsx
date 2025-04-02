"use client"

import { useState } from "react"
import { useNotifications, type Notification } from "@/contexts/notification-context"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, Check, Info, AlertTriangle, AlertCircle, MapPin, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAllNotifications } =
    useNotifications()
  const [open, setOpen] = useState(false)

  // Mark notifications as read when opening the popover
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen) {
      // Don't mark as read immediately to allow user to see which ones are unread
      // setTimeout(() => markAllAsRead(), 3000)
    }
  }

  // Get icon based on notification type
  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "info":
        return <Info className="h-4 w-4 text-info" />
      case "success":
        return <Check className="h-4 w-4 text-success" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case "incident":
        return <MapPin className="h-4 w-4 text-destructive" />
      default:
        return <Info className="h-4 w-4 text-info" />
    }
  }

  // Get background color based on notification type
  const getNotificationBg = (type: Notification["type"], read: boolean) => {
    if (read) return "bg-background hover:bg-muted/50"

    switch (type) {
      case "info":
        return "bg-info/10 hover:bg-info/20"
      case "success":
        return "bg-success/10 hover:bg-success/20"
      case "warning":
        return "bg-warning/10 hover:bg-warning/20"
      case "error":
      case "incident":
        return "bg-destructive/10 hover:bg-destructive/20"
      default:
        return "bg-primary/10 hover:bg-primary/20"
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-medium">Notifications</h3>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all as read
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={clearAllNotifications}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="w-full grid grid-cols-3 rounded-none">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread {unreadCount > 0 && `(${unreadCount})`}</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="m-0">
            <NotificationList
              notifications={notifications}
              getNotificationIcon={getNotificationIcon}
              getNotificationBg={getNotificationBg}
              markAsRead={markAsRead}
              removeNotification={removeNotification}
            />
          </TabsContent>

          <TabsContent value="unread" className="m-0">
            <NotificationList
              notifications={notifications.filter((n) => !n.read)}
              getNotificationIcon={getNotificationIcon}
              getNotificationBg={getNotificationBg}
              markAsRead={markAsRead}
              removeNotification={removeNotification}
            />
          </TabsContent>

          <TabsContent value="incidents" className="m-0">
            <NotificationList
              notifications={notifications.filter((n) => n.type === "incident")}
              getNotificationIcon={getNotificationIcon}
              getNotificationBg={getNotificationBg}
              markAsRead={markAsRead}
              removeNotification={removeNotification}
            />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

interface NotificationListProps {
  notifications: Notification[]
  getNotificationIcon: (type: Notification["type"]) => JSX.Element
  getNotificationBg: (type: Notification["type"], read: boolean) => string
  markAsRead: (id: string) => void
  removeNotification: (id: string) => void
}

function NotificationList({
  notifications,
  getNotificationIcon,
  getNotificationBg,
  markAsRead,
  removeNotification,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No notifications</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="divide-y">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-3 transition-colors ${getNotificationBg(notification.type, notification.read)}`}
            onClick={() => !notification.read && markAsRead(notification.id)}
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">{getNotificationIcon(notification.type)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${!notification.read ? "font-semibold" : ""}`}>
                    {notification.title}
                  </p>
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeNotification(notification.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{notification.message}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                  </p>
                  {notification.actionLabel && notification.actionFn && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        notification.actionFn?.()
                      }}
                    >
                      {notification.actionLabel}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

