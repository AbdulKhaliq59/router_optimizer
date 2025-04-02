"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { v4 as uuidv4 } from "uuid"

export type NotificationType = "info" | "success" | "warning" | "error" | "incident"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionLabel?: string
  actionFn?: () => void
  location?: [number, number]
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAllNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Update unread count whenever notifications change
  useEffect(() => {
    const count = notifications.filter((notification) => !notification.read).length
    setUnreadCount(count)
  }, [notifications])

  // Add a new notification
  const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: uuidv4(),
      timestamp: new Date(),
      read: false,
    }

    setNotifications((prev) => [newNotification, ...prev])

    // Play sound for important notifications
    if (notification.type === "incident" || notification.type === "error") {
      playNotificationSound()
    }
  }

  // Mark a notification as read
  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
  }

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
  }

  // Remove a notification
  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([])
  }

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio("/notification-sound.mp3")
      audio.play()
    } catch (error) {
      console.error("Failed to play notification sound:", error)
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

