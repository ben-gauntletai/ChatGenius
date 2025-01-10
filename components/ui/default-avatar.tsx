import { getUserColor } from '@/lib/colors';

export default function DefaultAvatar({ 
  userId,
  name = 'User',
  className = ''
}: { 
  userId?: string;
  name?: string;
  className?: string;
}) {
  const bgColor = userId ? getUserColor(userId) : '#6366f1';
  const initials = name.charAt(0).toUpperCase();

  return (
    <div 
      className={`flex items-center justify-center rounded-full text-white font-medium ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  );
} 