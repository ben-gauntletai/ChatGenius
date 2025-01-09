import { getUserColor } from '@/lib/colors';

interface DefaultAvatarProps {
  userId: string;
  name: string;
  className?: string;
}

export default function DefaultAvatar({ userId, name, className = '' }: DefaultAvatarProps) {
  const backgroundColor = getUserColor(userId);
  
  // Get initials from name (up to 2 characters)
  const initials = name
    .split(' ')
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={`flex items-center justify-center text-white font-medium ${className}`}
      style={{ backgroundColor }}
    >
      {initials}
    </div>
  );
} 