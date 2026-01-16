export const ANIMESALT_ENDPOINTS = [
  {
    name: "AnimeSalt Home",
    method: "GET",
    endpoint: "/api/animesalt",
    description: "Get recent anime releases from AnimeSalt homepage",
    requiresAuth: true,
    parameters: [
      { name: "page", type: "string", required: false, description: "Page number (default: 1)" },
    ],
    tsExample: `const response = await fetch(\`\${baseUrl}/api/animesalt?page=1\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

interface AnimeResult {
  title: string;
  url: string;
  image: string;
  type: "series" | "movie" | "unknown";
}

interface AnimeResponse {
  success: boolean;
  data: {
    results: AnimeResult[];
    currentPage: number;
    hasNextPage: boolean;
  };
}

const data: AnimeResponse = await response.json();
console.log(data);`,
    jsExample: `fetch(\`\${baseUrl}/api/animesalt?page=1\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    curlExample: `curl -X GET "https://your-domain.com/api/animesalt?page=1" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    responseExample: `{
  "success": true,
  "data": {
    "results": [
      {
        "title": "One Piece Episode 1100",
        "url": "https://animesalt.lol/one-piece-episode-1100",
        "image": "https://animesalt.lol/wp-content/uploads/...",
        "type": "series"
      }
    ],
    "currentPage": 1,
    "hasNextPage": true
  }
}`
  },
  {
    name: "AnimeSalt Search",
    method: "GET",
    endpoint: "/api/animesalt/search",
    description: "Search anime on AnimeSalt",
    requiresAuth: true,
    parameters: [
      { name: "q", type: "string", required: true, description: "Search query" },
    ],
    tsExample: `const response = await fetch(\`\${baseUrl}/api/animesalt/search?q=\${query}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

interface SearchResult {
  title: string;
  url: string;
  image: string;
  type: "series" | "movie" | "unknown";
  year?: string;
}

interface SearchResponse {
  success: boolean;
  data: {
    query: string;
    results: SearchResult[];
    totalResults: number;
  };
}

const data: SearchResponse = await response.json();
console.log(data);`,
    jsExample: `fetch(\`\${baseUrl}/api/animesalt/search?q=\${query}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    curlExample: `curl -X GET "https://your-domain.com/api/animesalt/search?q=naruto" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    responseExample: `{
  "success": true,
  "data": {
    "query": "naruto",
    "results": [
      {
        "title": "Naruto Shippuden",
        "url": "https://animesalt.lol/naruto-shippuden",
        "image": "https://animesalt.lol/wp-content/uploads/...",
        "type": "series",
        "year": "2007"
      }
    ],
    "totalResults": 10
  }
}`
  },
  {
    name: "AnimeSalt Details",
    method: "GET",
    endpoint: "/api/animesalt/details",
    description: "Get anime details including episodes and download links",
    requiresAuth: true,
    parameters: [
      { name: "url", type: "string", required: true, description: "Anime URL" },
    ],
    tsExample: `const response = await fetch(\`\${baseUrl}/api/animesalt/details?url=\${animeUrl}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

interface DownloadLink {
  quality: string;
  size?: string;
  url: string;
}

interface Episode {
  number: string;
  title?: string;
  url: string;
}

interface AnimeDetails {
  title: string;
  image?: string;
  description?: string;
  genres: string[];
  status?: string;
  type?: string;
  releaseYear?: string;
  episodes: Episode[];
  downloadLinks: DownloadLink[];
}

interface DetailsResponse {
  success: boolean;
  data: AnimeDetails;
}

const data: DetailsResponse = await response.json();
console.log(data);`,
    jsExample: `fetch(\`\${baseUrl}/api/animesalt/details?url=\${animeUrl}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    curlExample: `curl -X GET "https://your-domain.com/api/animesalt/details?url=https://animesalt.lol/one-piece" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    responseExample: `{
  "success": true,
  "data": {
    "title": "One Piece",
    "image": "https://animesalt.lol/wp-content/uploads/...",
    "description": "Monkey D. Luffy sets off on an adventure...",
    "genres": ["Action", "Adventure", "Comedy"],
    "status": "Ongoing",
    "type": "TV Series",
    "releaseYear": "1999",
    "episodes": [
      {
        "number": "1",
        "title": "I'm Luffy! The Man Who Will Become Pirate King!",
        "url": "https://animesalt.lol/one-piece-episode-1"
      }
    ],
    "downloadLinks": [
      {
        "quality": "1080p",
        "size": "450MB",
        "url": "https://..."
      }
    ]
  }
}`
  },
  {
    name: "AnimeSalt Stream",
    method: "GET",
    endpoint: "/api/animesalt/stream",
    description: "Get streaming links for anime episodes",
    requiresAuth: true,
    parameters: [
      { name: "url", type: "string", required: true, description: "Episode URL" },
    ],
    tsExample: `const response = await fetch(\`\${baseUrl}/api/animesalt/stream?url=\${episodeUrl}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

interface StreamSource {
  quality: string;
  url: string;
  type: string;
}

interface StreamResponse {
  success: boolean;
  data: {
    title: string;
    episode?: string;
    sources: StreamSource[];
    downloadLinks: Array<{
      quality: string;
      size?: string;
      url: string;
    }>;
  };
}

const data: StreamResponse = await response.json();
console.log(data);`,
    jsExample: `fetch(\`\${baseUrl}/api/animesalt/stream?url=\${episodeUrl}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    curlExample: `curl -X GET "https://your-domain.com/api/animesalt/stream?url=https://animesalt.lol/one-piece-episode-1" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    responseExample: `{
  "success": true,
  "data": {
    "title": "One Piece",
    "episode": "Episode 1",
    "sources": [
      {
        "quality": "1080p",
        "url": "https://stream.example.com/video.m3u8",
        "type": "m3u8"
      }
    ],
    "downloadLinks": [
      {
        "quality": "1080p",
        "size": "450MB",
        "url": "https://download.example.com/episode1.mp4"
      }
    ]
  }
}`
  }
];
