export const XP_ENDPOINTS = [
  {
    name: "XP Home",
    method: "GET",
    endpoint: "/api/adult/xp",
    provider: "Adult (XPrimeHub)",
    description: "Get latest adult content from xprimehub.my homepage (18+ Only)",
    requiresAuth: true,
    parameters: [
      { name: "page", type: "string", required: false, description: "Page number (default: 1)" },
    ],
    tsExample: `const response = await fetch(\`\${baseUrl}/api/adult/xp?page=1\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

interface Item {
  title: string;
  url: string;
  image: string;
  date: string;
}

interface XPResponse {
  success: boolean;
  page: number;
  hasNextPage: boolean;
  totalItems: number;
  items: Item[];
}

const data: XPResponse = await response.json();
console.log(data);`,
    jsExample: `fetch(\`\${baseUrl}/api/adult/xp?page=1\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    curlExample: `curl -X GET "https://screenscapeapi.dev/api/adult/xp?page=1" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    responseExample: `{
  "success": true,
  "page": 1,
  "hasNextPage": true,
  "totalItems": 18,
  "items": [
    {
      "title": "[18+] Horny Public (2026) English [Adults-Film] Video 720p [350MB] HDRip",
      "url": "https://xprimehub.my/horny-public-2026-english-short-films-720p-hdrip/",
      "image": "https://xprimehub.my/wp-content/uploads/2026/01/Horny-Public.jpg",
      "date": "Jan 18, 2026"
    }
  ]
}`
  },
  {
    name: "XP Search",
    method: "GET",
    endpoint: "/api/adult/xp/search",
    provider: "Adult (XPrimeHub)",
    description: "Search adult content on xprimehub.my (18+ Only)",
    requiresAuth: true,
    parameters: [
      { name: "q", type: "string", required: true, description: "Search query" },
    ],
    tsExample: `const response = await fetch(\`\${baseUrl}/api/adult/xp/search?q=\${encodeURIComponent(query)}\`, {
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
  date: string;
}

interface SearchResponse {
  success: boolean;
  query: string;
  totalResults: number;
  results: SearchResult[];
}

const data: SearchResponse = await response.json();
console.log(data);`,
    jsExample: `fetch(\`\${baseUrl}/api/adult/xp/search?q=\${encodeURIComponent(query)}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    curlExample: `curl -X GET "https://screenscapeapi.dev/api/adult/xp/search?q=brazzers" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    responseExample: `{
  "success": true,
  "query": "brazzers",
  "totalResults": 15,
  "results": [
    {
      "title": "[18+] Another Me (2026) Brazzers English [Adults-Film] Video 720p [350MB] HDRip",
      "url": "https://xprimehub.my/another-me-2026-english-short-films-720p-hdrip/",
      "image": "https://xprimehub.my/wp-content/uploads/2026/01/Another-Me.jpg",
      "date": "Jan 16, 2026"
    }
  ]
}`
  },
  {
    name: "XP Details",
    method: "GET",
    endpoint: "/api/adult/xp/details",
    provider: "Adult (XPrimeHub)",
    description: "Get detailed information about a specific adult content item including download links (18+ Only)",
    requiresAuth: true,
    parameters: [
      { name: "url", type: "string", required: true, description: "Full URL of the content page" },
    ],
    tsExample: `const response = await fetch(\`\${baseUrl}/api/adult/xp/details?url=\${encodeURIComponent(contentUrl)}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

interface MovieInfo {
  movieName?: string;
  releaseYear?: string;
  language?: string;
  quality?: string;
  format?: string;
}

interface DownloadLink {
  quality: string;
  size: string;
  url: string;
}

interface DetailsResponse {
  success: boolean;
  data: {
    title: string;
    movieInfo: MovieInfo;
    synopsis: string;
    screenshots: string[];
    downloadLinks: DownloadLink[];
    sourceUrl: string;
  };
}

const data: DetailsResponse = await response.json();
console.log(data);`,
    jsExample: `fetch(\`\${baseUrl}/api/adult/xp/details?url=\${encodeURIComponent(contentUrl)}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    curlExample: `curl -X GET "https://screenscapeapi.dev/api/adult/xp/details?url=https%3A%2F%2Fxprimehub.my%2Fperformers-of-the-year-2026-english-short-films-720p-hdrip%2F" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    responseExample: `{
  "success": true,
  "data": {
    "title": "[18+] Performers Of The Year (2026) ElegantAngel English [Adults-Film] Video 720p [800MB] HDRip",
    "movieInfo": {
      "movieName": "Performers Of The Year",
      "releaseYear": "2026",
      "language": "English",
      "quality": "720p || 1080p – HDRip",
      "format": "MKV"
    },
    "synopsis": "Performers Of The Year (2026) ElegantAngel English Short Film 720p HDRip Download",
    "screenshots": [
      "https://imgbb.zip/ib/i90sBxieAB0lbHm_1768689542.jpg"
    ],
    "downloadLinks": [
      {
        "quality": "720p",
        "size": "800MB",
        "url": "https://nexdrive.pro/genxfm784776464538/"
      }
    ],
    "sourceUrl": "https://xprimehub.my/performers-of-the-year-2026-english-short-films-720p-hdrip/"
  }
}`
  },
  {
    name: "NextDrive Link Extractor",
    method: "GET",
    endpoint: "/api/vega/nextdrive",
    provider: "Utilities",
    description: "Extract V-Cloud download links from NextDrive URLs (works with XPrimeHub and other sources)",
    requiresAuth: true,
    parameters: [
      { name: "url", type: "string", required: true, description: "Full NextDrive/Vega URL to extract links from" },
    ],
    tsExample: `const response = await fetch(\`\${baseUrl}/api/vega/nextdrive?url=\${encodeURIComponent(nextdriveUrl)}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

interface DownloadLink {
  label: string;
  url: string;
}

interface NextDriveResponse {
  success: boolean;
  title: string;
  vcloudLinks: DownloadLink[];
}

const data: NextDriveResponse = await response.json();
console.log(data);`,
    jsExample: `fetch(\`\${baseUrl}/api/vega/nextdrive?url=\${encodeURIComponent(nextdriveUrl)}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    curlExample: `curl -X GET "https://screenscapeapi.dev/api/vega/nextdrive?url=https%3A%2F%2Fnexdrive.pro%2Fgenxfm784776464538%2F" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    responseExample: `{
  "success": true,
  "title": "[18+] Performers Of The Year (2026) ElegantAngel English [Adults-Film] Video 720p [800MB] HDRip",
  "vcloudLinks": [
    {
      "label": "V-Cloud Link",
      "url": "https://vcloud.example.com/download/abc123"
    }
  ]
}`
  }
];
