import PusherServer from 'pusher'
import PusherClient from 'pusher-js'

// Clean the cluster value - remove quotes, comments, and whitespace
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.split('#')[0].replace(/['"]/g, '').trim() || 'us3'

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster,
  useTLS: true
})

export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster,
    forceTLS: true
  }
) 