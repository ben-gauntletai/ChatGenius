'use client'

import React, { createContext, useContext, useEffect } from 'react'
import { pusherClient } from '@/lib/pusher'
import { Message as MessageType } from '@/types'
import { useMessages } from './message-context'

interface PusherContextType {
  subscribeToChannel: (channelId: string) => void
  unsubscribeFromChannel: (channelId: string) => void
}

const PusherContext = createContext<PusherContextType | null>(null)

export function PusherProvider({ children }: { children: React.ReactNode }) {
  const { addMessage, updateMessage, deleteMessage } = useMessages()
  const activeSubscriptions = new Set<string>()

  const subscribeToChannel = (channelId: string) => {
    if (activeSubscriptions.has(channelId)) return

    console.log('Subscribing to channel:', channelId)
    const channel = pusherClient.subscribe(channelId)

    channel.bind('new-message', (message: MessageType) => {
      console.log('Received new message:', message)
      addMessage(message)
    })

    channel.bind('message-update', (message: MessageType) => {
      console.log('Received message update:', message)
      updateMessage(message)
    })

    channel.bind('message-delete', (messageId: string) => {
      console.log('Received message delete:', messageId)
      deleteMessage(messageId)
    })

    activeSubscriptions.add(channelId)
  }

  const unsubscribeFromChannel = (channelId: string) => {
    if (!activeSubscriptions.has(channelId)) return

    console.log('Unsubscribing from channel:', channelId)
    pusherClient.unsubscribe(channelId)
    activeSubscriptions.delete(channelId)
  }

  useEffect(() => {
    return () => {
      activeSubscriptions.forEach(channelId => {
        pusherClient.unsubscribe(channelId)
      })
    }
  }, [])

  const value = {
    subscribeToChannel,
    unsubscribeFromChannel
  }

  return (
    <PusherContext.Provider value={value}>
      {children}
    </PusherContext.Provider>
  )
}

export function usePusher() {
  const context = useContext(PusherContext)
  if (!context) {
    throw new Error('usePusher must be used within a PusherProvider')
  }
  return context
} 