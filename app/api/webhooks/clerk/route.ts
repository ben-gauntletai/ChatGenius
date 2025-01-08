import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
  }

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

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

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

  // Handle the event
  if (evt.type === 'user.signout') {
    const { user_id } = evt.data;

    // Update all workspace memberships for this user to OFFLINE
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: {
        userId: user_id
      }
    });

    // Update each membership and notify via Pusher
    await Promise.all(workspaceMembers.map(async (member) => {
      // Update status to OFFLINE
      await prisma.workspaceMember.update({
        where: {
          id: member.id
        },
        data: {
          status: 'OFFLINE'
        }
      });

      // Notify via Pusher
      await pusherServer.trigger(
        `workspace-${member.workspaceId}`,
        'member-status-update',
        { userId: user_id, status: 'OFFLINE' }
      );
    }));
  }

  return new Response('', { status: 200 });
} 