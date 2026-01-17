export const XS_ENDPOINTS = [
  {
    name: "XS Home",
    method: "GET",
    endpoint: "/api/adult/xs",
    provider: "Adult (XS)",
    description: "Get latest adult videos from xxxstreams.org homepage (18+ Only)",
    requiresAuth: true,
    parameters: [
      { name: "page", type: "string", required: false, description: "Page number (default: 1)" },
    ],
    tsExample: `const response = await fetch(\`\${baseUrl}/api/adult/xs?page=1\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

interface Article {
  title: string;
  url: string;
  image: string;
  categories: string[];
  isSticky?: boolean;
}

interface XSResponse {
  success: boolean;
  page: number;
  totalArticles: number;
  articles: Article[];
}

const data: XSResponse = await response.json();
console.log(data);`,
    jsExample: `fetch(\`\${baseUrl}/api/adult/xs?page=1\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    curlExample: `curl -X GET "https://screenscapeapi.dev/api/adult/xs?page=1" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    responseExample: `{
  "success": true,
  "page": 1,
  "totalArticles": 20,
  "articles": [
    {
      "title": "Transfixed 26/01/17 Leah Hayes Bringing The Date To Her FullHD MP4",
      "url": "https://xxxstreams.org/transfixed-26-01-17-leah-hayes-bringing-the-date-to-her-fullhd-mp4-narcos/",
      "image": "https://xxxstreams.org/wp-content/uploads/2026/01/narcos-tfx-26-01-17-leah-hayes-bringing-the-date-to-her-1080p.jpg",
      "categories": ["0day Clips"],
      "isSticky": false
    }
  ]
}`
  },
  {
    name: "XS Search",
    method: "GET",
    endpoint: "/api/adult/xs/search",
    provider: "Adult (XS)",
    description: "Search adult videos on xxxstreams.org (18+ Only)",
    requiresAuth: true,
    parameters: [
      { name: "query", type: "string", required: true, description: "Search query" },
    ],
    tsExample: `const response = await fetch(\`\${baseUrl}/api/adult/xs/search?q=\${query}\`, {
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
  category?: string;
}

interface SearchResponse {
  success: boolean;
  query: string;
  totalResults: number;
  results: SearchResult[];
}

const data: SearchResponse = await response.json();
console.log(data);`,
    jsExample: `fetch(\`\${baseUrl}/api/adult/xs/search?query=\${query}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    curlExample: `curl -X GET "https://screenscapeapi.dev/api/adult/xs/search?query=mom" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    responseExample: `{
  "success": true,
  "query": "mom",
  "totalResults": 15,
  "results": [
    {
      "title": "Alex Bishop – Girlfriend's Free Use Step-Mom",
      "url": "https://xxxstreams.org/alex-bishop-girlfriends-free-use-step-mom/",
      "image": "https://xxxstreams.org/wp-content/uploads/2026/01/alex_bishop_-_girlfriends_free_use_step-mom.jpg",
      "category": "Girlfriends"
    }
  ]
}`
  },
  {
    name: "XS Stream Details",
    method: "GET",
    endpoint: "/api/adult/xs/stream",
    provider: "Adult (XS)",
    description: "Get video stream details and download links from xxxstreams.org (18+ Only)",
    requiresAuth: true,
    parameters: [
      { name: "url", type: "string", required: true, description: "Full URL of the video page" },
    ],
    tsExample: `const response = await fetch(\`\${baseUrl}/api/adult/xs/stream?url=\${encodeURIComponent(videoUrl)}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

interface VideoData {
  format: string;
  size: string;
  duration: string;
  resolution: string;
}

interface TezfilesData {
  id: string;
  name: string;
  size: number;
  contentType: string;
  videoInfo: {
    duration: number;
    isStreamable: boolean;
    resolution: {
      width: number;
      height: number;
    };
    format: string;
    w320h240: string[];
  };
  thumbnails: string[];
  videoPreview: {
    video: string;
    duration: number;
    alternativeResolutions: Array<{
      resolution: string;
      url: string;
    }>;
    cover: string;
  };
}

interface StreamResponse {
  success: boolean;
  video: VideoData;
  downloadLink: string;
  streamUrl: string;
  thumbnail: {
    url: string;
    alt: string;
  };
  tezfilesData: TezfilesData | null;
}

const data: StreamResponse = await response.json();
console.log(data);`,
    jsExample: `fetch(\`\${baseUrl}/api/adult/xs/stream?url=\${encodeURIComponent(videoUrl)}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    curlExample: `curl -X GET "https://screenscapeapi.dev/api/adult/xs/stream?url=https%3A%2F%2Fxxxstreams.org%2Fvideo-page" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    responseExample: `{
  "success": true,
  "video": {
    "format": "mp4",
    "size": "828.49 MB",
    "duration": "00:29:52",
    "resolution": "1920X1080"
  },
  "downloadLink": "https://tezfiles.com/file/072833ee8cc6b/video.mp4",
  "streamUrl": "https://tezfiles.com/file/072833ee8cc6b/video.mp4",
  "thumbnail": {
    "url": "https://xxxstreams.org/wp-content/uploads/2026/01/video-thumbnail.jpg",
    "alt": "Video Title"
  },
  "tezfilesData": {
    "id": "072833ee8cc6b",
    "name": "video.mp4",
    "size": 868464423,
    "contentType": "video/mp4",
    "videoInfo": {
      "duration": 1792.942,
      "isStreamable": true,
      "resolution": {
        "width": 1920,
        "height": 1080
      },
      "format": "mp4",
      "w320h240": ["https://static-cache.tezfiles.com/thumbnail/..."]
    },
    "thumbnails": ["https://static-cache.tezfiles.com/thumbnail/..."],
    "videoPreview": {
      "video": "https://str-09.filestore.app/...",
      "duration": 90,
      "alternativeResolutions": [
        {
          "resolution": "360p",
          "url": "https://str-27.filestore.app/..."
        }
      ],
      "cover": "https://static-cache.tezfiles.com/thumbnail/..."
    }
  }
}`
  },
];
