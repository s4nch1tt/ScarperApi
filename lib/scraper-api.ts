import axios from 'axios';

function getScraperApiKeys(): string[] {
  const keys = process.env.SCRAPER_API_KEYS;
  if (!keys) {
    throw new Error('SCRAPER_API_KEYS environment variable is not set');
  }
  return keys.split(',').map(key => key.trim());
}

function getRandomApiKey(): string {
  const SCRAPER_API_KEYS = getScraperApiKeys();
  const randomIndex = Math.floor(Math.random() * SCRAPER_API_KEYS.length);
  return SCRAPER_API_KEYS[randomIndex];
}

export async function fetchWithScraperApi(url: string): Promise<string> {
  const apiKey = getRandomApiKey();
  const scraperApiUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}`;

  const response = await axios.get(scraperApiUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
    }
  });

  return response.data;
}
