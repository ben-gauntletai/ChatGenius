// Standard rainbow colors - not too dark, not too light
const colorPalette = [
  '#FF6B6B', // red
  '#FF922B', // orange
  '#FCC419', // yellow
  '#51CF66', // green
  '#339AF0', // blue
  '#845EF7', // purple
  '#F06595', // pink
  '#20C997', // teal
  '#FF8787', // coral
  '#FF922B', // orange-yellow
  '#94D82D', // lime
  '#4C6EF5', // indigo
  '#BE4BDB', // violet
  '#FF8ED4', // rose
  '#FF9F1C'  // amber
];

export function getUserColor(userId: string): string {
  // Return a default color if userId is undefined
  if (!userId) return '#6366f1';

  // Use a simple hash function to get a consistent number from the userId
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  // Use the hash to select a color from our palette
  const colors = [
    '#6366f1', // Indigo
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#f43f5e', // Rose
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#84cc16', // Lime
    '#22c55e', // Green
    '#10b981', // Emerald
    '#14b8a6', // Teal
    '#06b6d4', // Cyan
    '#0ea5e9', // Light Blue
    '#3b82f6'  // Blue
  ];

  return colors[Math.abs(hash) % colors.length];
} 