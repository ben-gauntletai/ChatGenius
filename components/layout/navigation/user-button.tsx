'use client';

import { SignOutButton, useClerk } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";

export default function UserButton() {
  const { userId } = useAuth();
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    if (userId) {
      try {
        // Update status to offline first
        const response = await fetch('/api/status/sign-out', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId })
        });

        if (!response.ok) {
          console.error('Failed to update status:', await response.text());
        }

        // Only sign out after status is updated
        await signOut();
      } catch (error) {
        console.error('Failed during sign out process:', error);
      }
    }
  };

  return (
    <button 
      onClick={handleSignOut}
      className="w-full px-3 py-2 text-sm text-white/70 hover:text-white transition"
    >
      Sign Out
    </button>
  );
} 