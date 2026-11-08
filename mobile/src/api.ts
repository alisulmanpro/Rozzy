import type { ParseResponse } from "./types";

// Android emulator reaches your PC at 10.0.2.2; a real phone needs your PC's LAN IP (e.g. http://192.168.1.5:8000)
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:8000";

export async function parseSentence(text: string): Promise<ParseResponse> {
  const res = await fetch(`${API_URL}/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Parse failed: ${res.status}`);
  return res.json();
}
