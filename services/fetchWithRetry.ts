import axios from "axios";

export default async function fetchWithRetry(
  url: string,
  retries = 3,
  delayMs = 500
): Promise<any | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(url, { timeout: 10000 });
      if (res.status >= 200 && res.status < 300) return res.data;
      console.warn(`⚠️ fetch attempt ${i + 1} returned status ${res.status}`);
    } catch (err: any) {
      console.warn(`⚠️ fetch attempt ${i + 1} failed:`, err?.message || err);
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}
