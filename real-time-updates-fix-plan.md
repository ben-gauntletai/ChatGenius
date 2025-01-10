# Streamlined Real-time Updates Fix Plan

## Core Issues to Fix
1. Profile and status updates require page refresh
2. Inconsistent event names between server and client
3. State management is scattered across components

## Solution Plan

### 1. Standardize Pusher Events
```typescript
// lib/pusher-events.ts
export const EVENTS = {
  MEMBER_UPDATE: 'member:update',     // Single event for all member updates (profile, status)
  ERROR: 'error'                      // For error broadcasting
} as const;

// Single event type for all member updates
interface MemberUpdateEvent {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  status: string;
  hasCustomName: boolean;
  hasCustomImage: boolean;
}
```

### 2. Centralize State Management
```typescript
// contexts/workspace-members-context.tsx
interface WorkspaceMembersState {
  members: Member[];
  currentMember: Member | null;
  isLoading: boolean;
  error: Error | null;
}

interface WorkspaceMembersActions {
  updateMember: (memberId: string, updates: Partial<Member>) => Promise<void>;
  refetchMembers: () => Promise<void>;
  clearError: () => void;
}

// Simplified optimistic updates
const updateMember = async (memberId: string, updates: Partial<Member>) => {
  try {
    // Optimistic update
    setMembers(current => 
      current.map(member =>
        member.id === memberId
          ? { ...member, ...updates }
          : member
      )
    );

    // API call
    const response = await fetch('/api/profile/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update member');
    }
  } catch (error) {
    // On failure, refetch to ensure consistency
    await refetchMembers();
    setError(error);
  }
};
```

### 3. Update API Routes
```typescript
// app/api/profile/update/route.ts
try {
  const { userName, status, imageUrl } = req.body;
  
  const updatedMember = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: {
      userName: userName || 'User',
      status,
      userImage: imageUrl,
      hasCustomName: !!userName,
      hasCustomImage: !!imageUrl
    }
  });

  // Single event for all updates
  await pusherServer.trigger(
    `workspace-${member.workspaceId}`,
    EVENTS.MEMBER_UPDATE,
    updatedMember
  );

  return NextResponse.json(updatedMember);
} catch (error) {
  console.error('PROFILE_UPDATE_ERROR:', error);
  return new NextResponse('Internal Error', { status: 500 });
}
```

### 4. Component Updates
1. Update ProfileModal:
```typescript
const { updateMember, error } = useWorkspaceMembers();

const handleSave = async () => {
  try {
    setIsLoading(true);
    await updateMember(memberId, {
      userName: userName.trim() || 'User',
      status,
      imageUrl: uploadedImage
    });
    onClose();
  } catch (error) {
    console.error('Error saving profile:', error);
  } finally {
    setIsLoading(false);
  }
};
```

2. Update UserProfile:
```typescript
const { currentMember } = useWorkspaceMembers();

// Use context data directly
const displayName = currentMember?.userName || 'User';
const profileImage = currentMember?.userImage;
const hasCustomImage = currentMember?.hasCustomImage || false;
```

## Implementation Steps

1. **Phase 1: Event Standardization** (1 day)
   - Create `pusher-events.ts` with standardized events
   - Update API routes to use standardized events

2. **Phase 2: Context Update** (1-2 days)
   - Update WorkspaceMembersContext with optimistic updates
   - Add proper error handling

3. **Phase 3: Component Migration** (1 day)
   - Update ProfileModal to use context
   - Update UserProfile to use context
   - Remove redundant state management

4. **Phase 4: Testing** (1 day)
   - Test profile updates without refresh
   - Test status updates without refresh
   - Verify no regression in existing functionality

## Success Criteria
1. Profile updates reflect immediately across all components
2. Status updates reflect immediately across all components
3. No page refreshes required for any updates
4. Existing functionality remains intact

## Benefits
1. Consistent real-time updates
2. Improved user experience
3. Simplified state management
4. Better code maintainability

## Timeline
Total: 4-5 days

## Next Steps
1. Create `pusher-events.ts`
2. Update WorkspaceMembersContext
3. Update API routes
4. Migrate components one by one 