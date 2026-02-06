export interface Game {
  id: string;
  name: string;
  description: string;
  executable: string;  // Path naar .exe of .py
  thumbnail?: string;
  category?: string;
}