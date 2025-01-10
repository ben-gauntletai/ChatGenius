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
    console.log('\n=== Webhook Verification ===');
    console.log('Headers:', {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature
    });
    console.log('Secret:', process.env.CLERK_WEBHOOK_SECRET?.substring(0, 10) + '...');
    console.log('Body:', body);

    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('\n=== Webhook Verification Error ===');
    console.error('Error:', err);
    console.error('Error message:', (err as Error).message);
    return new Response('Error verifying webhook signature', {
      status: 401
    });
  }

  // Handle the webhook
  const eventType = evt.type;
  console.log('\n=== Webhook Event ===');
  console.log('Event Type:', eventType);
  console.log('Event Data:', evt.data);

  // Handle both session.ended and session.removed events
  if (eventType === 'session.ended' || eventType === 'session.removed') {
    const { user_id } = evt.data;
    console.log('\n=== Session Ended/Removed ===');
    console.log('User ID:', user_id);

    try {
      // Find all workspace memberships for the user
      const members = await prisma.workspaceMember.findMany({
        where: {
          userId: user_id
        }
      });

      console.log('\n=== Found Members ===');
      console.log('Members:', members);

      // Update status to offline for all memberships
      for (const member of members) {
        console.log('\n=== Updating Member ===');
        console.log('Member ID:', member.id);
        console.log('Current Status:', member.status);
        
        // Only update lastActiveStatus if current status isn't already OFFLINE
        const updatedMember = await prisma.workspaceMember.update({
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

        console.log('Updated Status:', updatedMember.status);

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