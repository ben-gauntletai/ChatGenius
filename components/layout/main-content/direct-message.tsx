<Thread
  isOpen={isThreadOpen}
  onClose={() => setIsThreadOpen(false)}
  parentMessage={{
    ...message,
    conversationId: true // This flags it as a DM
  }}
  workspaceId={workspaceId}
  onReplyCountChange={onReplyCountChange}
/> 