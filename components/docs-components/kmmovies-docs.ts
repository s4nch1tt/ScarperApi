export const KMMOVIES_ENDPOINTS = [
  {
    name: "KMMovies Home",
    method: "GET",
    endpoint: "/api/kmmovies",
    description: "Get latest movie releases from KMMovies homepage",
    requiresAuth: true,
    parameters: [
      { name: "page", type: "string", required: false, description: "Page number (default: 1)" },
    ],
    tsExample: `const response = await fetch(\`\${baseUrl}/api/kmmovies?page=1\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

interface Movie {
  id: string;
  title: string;
  url: string;
  image: string;
  imageAlt: string;
}

interface Pagination {
  current: number;
  next: string | null;
  last: string | null;
}

interface KMMoviesResponse {
  success: boolean;
  data: {
    movies: Movie[];
    pagination: Pagination;
  };
}

const data: KMMoviesResponse = await response.json();
console.log(data);`,
    jsExample: `fetch(\`\${baseUrl}/api/kmmovies?page=1\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    curlExample: `curl -X GET "https://your-domain.com/api/kmmovies?page=1" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    responseExample: `{
  "success": true,
  "data": {
    "movies": [
      {
        "id": "108066",
        "title": "Rahu Ketu 2026 Hindi Download 1080p HDTC",
        "url": "https://kmmovies.store/rahu-ketu-2026/",
        "image": "https://kmmovies.store/wp-content/uploads/...",
        "imageAlt": "Rahu Ketu 2026 Poster"
      }
    ],
    "pagination": {
      "current": 1,
      "next": "2",
      "last": "360"
    }
  }
}`
  },
  {
    name: "KMMovies Search",
    method: "GET",
    endpoint: "/api/kmmovies/search",
    description: "Search movies on KMMovies",
    requiresAuth: true,
    parameters: [
      { name: "q", type: "string", required: true, description: "Search query" },
    ],
    tsExample: `const response = await fetch(\`\${baseUrl}/api/kmmovies/search?q=\${query}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

interface Movie {
  id: string;
  title: string;
  url: string;
  image: string;
  imageAlt: string;
}

interface SearchResponse {
  success: boolean;
  data: {
    query: string;
    results: Movie[];
    totalResults: number;
  };
}

const data: SearchResponse = await response.json();
console.log(data);`,
    jsExample: `fetch(\`\${baseUrl}/api/kmmovies/search?q=\${query}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    curlExample: `curl -X GET "https://your-domain.com/api/kmmovies/search?q=inception" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    responseExample: `{
  "success": true,
  "data": {
    "query": "inception",
    "results": [
      {
        "id": "12345",
        "title": "Inception 2010 Dual Audio Download",
        "url": "https://kmmovies.store/inception-2010/",
        "image": "https://kmmovies.store/wp-content/uploads/...",
        "imageAlt": "Inception 2010 Poster"
      }
    ],
    "totalResults": 5
  }
}`
  },
  {
    name: "KMMovies Details",
    method: "GET",
    endpoint: "/api/kmmovies/details",
    description: "Get movie details including screenshots, info, and download links",
    requiresAuth: true,
    parameters: [
      { name: "url", type: "string", required: true, description: "Movie URL" },
    ],
    tsExample: `const response = await fetch(\`\${baseUrl}/api/kmmovies/details?url=\${movieUrl}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

interface DownloadLink {
  quality: string;
  badge?: string;
  fileSize?: string;
  url: string;
}

interface MovieInfo {
  imdbRating?: string;
  movieName?: string;
  director?: string;
  starring?: string;
  genres?: string;
  runningTime?: string;
  writer?: string;
  releaseDate?: string;
  ott?: string;
  quality?: string;
  language?: string;
  subtitles?: string;
  format?: string;
}

interface DetailsResponse {
  success: boolean;
  data: {
    title: string;
    releaseDate?: string;
    categories: string[];
    posterImage?: string;
    screenshots: string[];
    storyline?: string;
    movieInfo: MovieInfo;
    downloadLinks: DownloadLink[];
  };
}

const data: DetailsResponse = await response.json();
console.log(data);`,
    jsExample: `fetch(\`\${baseUrl}/api/kmmovies/details?url=\${movieUrl}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    curlExample: `curl -X GET "https://your-domain.com/api/kmmovies/details?url=https://kmmovies.store/inception-2010/" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    responseExample: `{
  "success": true,
  "data": {
    "title": "Inception 2010 Dual Audio Download",
    "releaseDate": "16 July 2010",
    "categories": ["Hollywood", "Dual Audio", "Movies"],
    "posterImage": "https://kmmovies.store/wp-content/uploads/...",
    "screenshots": [
      "https://images.kmphotos.cv/screenshot1.webp",
      "https://images.kmphotos.cv/screenshot2.webp"
    ],
    "storyline": "A thief who steals corporate secrets...",
    "movieInfo": {
      "imdbRating": "8.8/10",
      "movieName": "Inception (2010)",
      "director": "Christopher Nolan",
      "starring": "Leonardo DiCaprio, Joseph Gordon-Levitt",
      "genres": "Action, Sci-Fi, Thriller",
      "runningTime": "148 min",
      "releaseDate": "16 Jul 2010",
      "ott": "Netflix, Amazon Prime Video",
      "quality": "480p || 720p || 1080p || 4K",
      "language": "Hindi, English",
      "subtitles": "English",
      "format": "MKV"
    },
    "downloadLinks": [
      {
        "quality": "480p",
        "fileSize": "450MB",
        "url": "https://w1.magiclinks.my/..."
      },
      {
        "quality": "1080p",
        "badge": "HQ",
        "fileSize": "2.5GB",
        "url": "https://w1.magiclinks.my/..."
      }
    ]
  }
}`
  },
  {
    name: "KMMovies Magic Links",
    method: "GET",
    endpoint: "/api/kmmovies/magiclinks",
    description: "Get all download server links from magic links page with resolved streaming URLs",
    requiresAuth: true,
    parameters: [
      { name: "url", type: "string", required: true, description: "Magic links URL from download link" },
    ],
    tsExample: `const response = await fetch(\`\${baseUrl}/api/kmmovies/magiclinks?url=\${magicUrl}\`, {
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

interface FileInfo {
  fileName?: string;
  size?: string;
  format?: string;
  dateAdded?: string;
}

interface MagicLinksResponse {
  success: boolean;
  data: {
    fileInfo: FileInfo;
    downloadLinks: DownloadLink[];
  };
}

const data: MagicLinksResponse = await response.json();
console.log(data);`,
    jsExample: `fetch(\`\${baseUrl}/api/kmmovies/magiclinks?url=\${magicUrl}\`, {
  method: 'GET',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    curlExample: `curl -X GET "https://your-domain.com/api/kmmovies/magiclinks?url=https://w1.magiclinks.my/12345/" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    responseExample: `{
  "success": true,
  "data": {
    "fileInfo": {
      "fileName": "Inception.2010.Hindi.1080p.BluRay.x264.mkv",
      "size": "2.5GB",
      "format": "MKV",
      "dateAdded": "2026-01-16"
    },
    "downloadLinks": [
      {
        "label": "WATCH ONLINE",
        "url": "https://w1.zipzap.lol/nf/index.php?videoUrl=https%3A%2F%2Fpub-210cae7350984565b187867103b2aa3e.r2.dev%2FInception.2010.mkv"
      },
      {
        "label": "SKYDROP (10 GBPS)",
        "url": "https://w1.skydrop.sbs/download.php?id=..."
      },
      {
        "label": "ZIP-ZAP",
        "url": "https://w1.zipzap.lol/download99.php?file=..."
      },
      {
        "label": "TELEGRAM",
        "url": "https://t.me/kmsenderbot?start=..."
      },
      {
        "label": "ONE CLICK",
        "url": "https://w1.zipzap.lol/clouddownload.php?file_id=..."
      },
      {
        "label": "GOFILE",
        "url": "https://gofile.io/d/..."
      }
    ]
  }
}`
  }
];
