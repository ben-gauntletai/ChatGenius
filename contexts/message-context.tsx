'use client'

import React, { createContext, useContext, useState } from 'react'
import { Message as MessageType } from '@/types'

interface MessageContextType {
  messages: { [key: string]: MessageType }
  addMessage: (message: MessageType) => void
  updateMessage: (message: MessageType) => void
  deleteMessage: (messageId: string) => void
  getChannelMessages: (channelId: string) => MessageType[]
  getThreadMessages: (parentMessageId: string) => MessageType[]
}

const MessageContext = createContext<MessageContextType | null>(null)

export function MessageProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<{ [key: string]: MessageType }>({})

  const addMessage = (message: MessageType) => {
    console.log('Adding message:', message)
    setMessages(current => {
      // Don't add if message already exists
      if (current[message.id]) return current

      return {
        ...current,
        [message.id]: message
      }
    })
  }

  const updateMessage = (message: MessageType) => {
    console.log('Updating message:', message)
    setMessages(current => {
      return {
        ...current,
        [message.id]: {
          ...current[message.id],
          ...message
        }
      }
    })
  }

  const deleteMessage = (messageId: string) => {
    setMessages(current => {
      const { [messageId]: deleted, ...rest } = current
      return rest
    })
  }

  const getChannelMessages = (channelId: string) => {
    return Object.values(messages)
      .filter(msg => msg.channelId === channelId && !msg.threadId && !msg.isThreadReply)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  const getThreadMessages = (parentMessageId: string) => {
    console.log('Getting thread messages for:', parentMessageId)
    console.log('All messages:', messages)
    const threadMessages = Object.values(messages)
      .filter(msg => {
        // Include the parent message
        if (msg.id === parentMessageId) return true
        // Include messages that are replies to this thread
        if (msg.parentMessageId === parentMessageId) return true
        return false
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    console.log('Thread messages:', threadMessages)
    return threadMessages
  }

  const value = {
    messages,
    addMessage,
    updateMessage,
    deleteMessage,
    getChannelMessages,
    getThreadMessages
  }

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  )
}

export function useMessages() {
  const context = useContext(MessageContext)
  if (!context) {
    throw new Error('useMessages must be used within a MessageProvider')
  }
  return context
} 