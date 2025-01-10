import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'session.ended') {
    const { user_id } = evt.data;

    try {
      // Find all workspace memberships for the user
      const members = await prisma.workspaceMember.findMany({
        where: {
          userId: user_id
        }
      });

      // Update status to offline for all memberships
      for (const member of members) {
        // Only update lastActiveStatus if current status isn't already OFFLINE
        await prisma.workspaceMember.update({
          where: {
            id: member.id
          },
          data: {
            ...(member.status !== 'OFFLINE' && {
              lastActiveStatus: member.status
            }),
            status: 'OFFLINE'
          }
        });

        // Broadcast status change to all workspace members
        await pusherServer.trigger(
          `workspace:${member.workspaceId}`,
          'member:update',
          {
            id: member.id,
            status: 'OFFLINE'
          }
        );
      }

      return new Response('Status updated to offline', { status: 200 });
    } catch (error) {
      console.error('Error updating status:', error);
      return new Response('Error updating status', { status: 500 });
    }
  }

  return new Response('', { status: 200 });
} 