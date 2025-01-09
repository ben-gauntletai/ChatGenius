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
  // Use a simple hash function to get a consistent number from the userId
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  // Use the absolute value of the hash to get a positive number
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
} 