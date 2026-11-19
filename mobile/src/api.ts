import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ParseResponse } from './types';

export const STORAGE_KEY_API_URL = 'rozzy:server_address';

// Android emulator reaches host PC at 10.0.2.2; a real phone needs LAN IP (e.g. http://192.168.1.5:8000)
export const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000';

export let API_URL = DEFAULT_API_URL;

/**
 * Validates and normalizes a backend API URL.
 * Checks protocol (http/https), hostname existence, and removes trailing slashes.
 */
export function normalizeAndValidateUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');

  if (!trimmed) {
    throw new Error('Server address cannot be empty.');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Invalid URL format. Example: http://192.168.1.5:8000');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Server address must use http:// or https://');
  }

  if (!parsed.hostname) {
    throw new Error('Server address must include a valid host or IP address.');
  }

  return trimmed;
}

/**
 * Returns the currently active API base URL, reading from AsyncStorage if customized by the user.
 */
export async function getApiUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_API_URL);
    if (saved && saved.trim()) {
      API_URL = normalizeAndValidateUrl(saved);
      return API_URL;
    }
  } catch {
    // Fall back to default if storage read or URL parse fails
  }

  API_URL = DEFAULT_API_URL;
  return API_URL;
}

/**
 * Persists a customized backend server address to AsyncStorage after validation.
 */
export async function setApiUrl(newUrl: string): Promise<string> {
  const validated = normalizeAndValidateUrl(newUrl);
  await AsyncStorage.setItem(STORAGE_KEY_API_URL, validated);
  API_URL = validated;
  return validated;
}

/**
 * Tests connection to the backend FastAPI `/health` endpoint.
 * Times out after 4 seconds to prevent UI hangs.
 */
export async function testApiConnection(
  targetUrl?: string,
): Promise<{ ok: boolean; status?: string; model?: string; error?: string }> {
  try {
    const baseUrl = targetUrl
      ? normalizeAndValidateUrl(targetUrl)
      : await getApiUrl();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        ok: false,
        error: `Server responded with HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as { status?: string; model?: string };
    return {
      ok: true,
      status: data.status ?? 'ok',
      model: data.model,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.name === 'AbortError'
          ? 'Rabta timeout ho gaya (4 seconds)'
          : err.message
        : 'Server se rabta nahi ho saka';
    return {
      ok: false,
      error: message,
    };
  }
}

/**
 * Sends spoken/typed sentence to the FastAPI backend NLU parser.
 */
export async function parseSentence(text: string): Promise<ParseResponse> {
  const baseUrl = await getApiUrl();
  const res = await fetch(`${baseUrl}/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`Parse failed: ${res.status}`);
  }

  return res.json();
}
