"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Play, Code2, Home, Search, Film, Download, Cloud, Info } from "lucide-react";
import { toast } from "sonner";

interface ApiEndpoint {
  method: string;
  endpoint: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
}

interface ApiCategory {
  name: string;
  icon: React.ReactNode;
  endpoints: ApiEndpoint[];
  color: string;
}

const tenBitClubApiCategories: ApiCategory[] = [
  {
    name: "Get Movies",
    icon: <Home className="h-4 w-4" />,
    color: "bg-blue-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/10bitclub",
        description: "Get all movies and shows with pagination from 10BitClub",
        params: [
          { name: "page", type: "number", required: false, description: "Page number for pagination (default: 1)" }
        ]
      }
    ]
  },
  {
    name: "Search Movies",
    icon: <Search className="h-4 w-4" />,
    color: "bg-green-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/10bitclub",
        description: "Search movies and shows by title on 10BitClub",
        params: [
          { name: "search", type: "string", required: true, description: "Search query (movie/show title)" }
        ]
      }
    ]
  },
  {
    name: "Movie Details",
    icon: <Info className="h-4 w-4" />,
    color: "bg-purple-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/10bitclub/details",
        description: "Get detailed movie information including synopsis and HubCloud links",
        params: [
          { name: "url", type: "string", required: true, description: "Full movie URL from 10bitclub.xyz (e.g., https://10bitclub.xyz/movie-name/)" }
        ]
      }
    ]
  },
  {
    name: "HubCloud Links",
    icon: <Cloud className="h-4 w-4" />,
    color: "bg-orange-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/hubcloud",
        description: "Get direct streaming/download links from HubCloud file URLs",
        params: [
          { name: "url", type: "string", required: true, description: "HubCloud file URL (e.g., https://hubcloud.lol/file/xyz123)" }
        ]
      }
    ]
  }
];

interface TenBitClubDocsProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

// Colorized JSON component
const ColorizedJSON = ({ data, title = "Response" }: { data: string; title?: string }) => {
  const colorizeJSON = (jsonString: string) => {
    return jsonString
      .replace(/"([^"]+)":/g, '<span class="text-blue-400">"$1"</span>:')
      .replace(/: "([^"]+)"/g, ': <span class="text-green-400">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="text-yellow-400">$1</span>')
      .replace(/: (true|false)/g, ': <span class="text-purple-400">$1</span>')
      .replace(/: null/g, ': <span class="text-gray-400">null</span>')
      .replace(/\[/g, '<span class="text-red-400">[</span>')
      .replace(/\]/g, '<span class="text-red-400">]</span>')
      .replace(/{/g, '<span class="text-cyan-400">{</span>')
      .replace(/}/g, '<span class="text-cyan-400">}</span>');
  };

  return (
    <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
      <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
          </div>
          <span className="text-gray-300 text-sm ml-2 truncate">{title}.json</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2 shrink-0"
          onClick={() => {
            navigator.clipboard.writeText(data);
            toast.success("Copied to clipboard!");
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-4">
          <code 
            className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={{ __html: colorizeJSON(data) }}
          />
        </pre>
      </div>
    </div>
  );
};

export default function TenBitClubDocs({ apiKey, onApiKeyChange }: TenBitClubDocsProps) {
  const [selectedCategory, setSelectedCategory] = useState(tenBitClubApiCategories[0]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(tenBitClubApiCategories[0].endpoints[0]);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleCategoryChange = (categoryName: string) => {
    const category = tenBitClubApiCategories.find(cat => cat.name === categoryName);
    if (category) {
      setSelectedCategory(category);
      setSelectedEndpoint(category.endpoints[0]);
      setTestParams({});
    }
  };

  const handleEndpointChange = (endpointPath: string) => {
    const endpoint = selectedCategory.endpoints.find(ep => ep.endpoint === endpointPath);
    if (endpoint) {
      setSelectedEndpoint(endpoint);
      setTestParams({});
    }
  };

  const testApi = async () => {
    if (!apiKey) {
      toast.error("Please enter your API key");
      return;
    }

    const missingParams = selectedEndpoint.params?.filter(param => 
      param.required && !testParams[param.name]
    ) || [];

    if (missingParams.length > 0) {
      toast.error(`Missing required parameters: ${missingParams.map(p => p.name).join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      let url = selectedEndpoint.endpoint;
      
      const queryParams = new URLSearchParams();
      Object.entries(testParams).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });

      if (queryParams.toString()) {
        url += "?" + queryParams.toString();
      }

      const res = await fetch(url, {
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
      
      if (!res.ok) {
        toast.error(`Error: ${res.status}`);
      } else {
        toast.success("API call successful!");
      }
    } catch (error) {
      toast.error("Failed to call API");
      setResponse(JSON.stringify({ error: "Failed to call API" }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const generateCodeExample = (language: string) => {
    const params = Object.entries(testParams).filter(([_, value]) => value);
    const baseUrl = "https://totu.me";
    
    let url = selectedEndpoint.endpoint;
    const queryParams = params.map(([key, value]) => `${key}=${value}`).join("&");
    if (queryParams) {
      url += "?" + queryParams;
    }

    switch (language) {
      case "javascript":
        if (selectedCategory.name === "Get Movies") {
          return `// Get movies from 10BitClub
const response = await fetch("${baseUrl}/api/10bitclub", {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.posts); // Array of movies and shows

// With pagination
const page2 = await fetch("${baseUrl}/api/10bitclub?page=2", {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});`;
        } else if (selectedCategory.name === "Search Movies") {
          return `// Search movies on 10BitClub
const searchQuery = "avengers";
const response = await fetch(\`${baseUrl}/api/10bitclub?search=\${encodeURIComponent(searchQuery)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.posts); // Search results`;
        } else if (selectedCategory.name === "Movie Details") {
          return `// Get movie details from 10BitClub
const movieUrl = "https://10bitclub.xyz/avengers-endgame-2019/";
const response = await fetch(\`${baseUrl}/api/10bitclub/details?url=\${encodeURIComponent(movieUrl)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data); // Movie details with HubCloud links`;
        } else if (selectedCategory.name === "HubCloud Links") {
          return `// Get HubCloud streaming links
const hubcloudUrl = "https://hubcloud.lol/file/xyz123";
const response = await fetch(\`${baseUrl}/api/hubcloud?url=\${encodeURIComponent(hubcloudUrl)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.links); // Direct streaming/download links`;
        }

      case "python":
        if (selectedCategory.name === "Get Movies") {
          return `# Get movies from 10BitClub
import requests

url = "${baseUrl}/api/10bitclub"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["posts"])  # Array of movies and shows

# With pagination
page_2_response = requests.get(f"{url}?page=2", headers=headers)`;
        } else if (selectedCategory.name === "Search Movies") {
          return `# Search movies on 10BitClub
import requests
from urllib.parse import quote

search_query = "avengers"
url = f"${baseUrl}/api/10bitclub?search={quote(search_query)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["posts"])  # Search results`;
        } else if (selectedCategory.name === "Movie Details") {
          return `# Get movie details from 10BitClub
import requests
from urllib.parse import quote

movie_url = "https://10bitclub.xyz/avengers-endgame-2019/"
url = f"${baseUrl}/api/10bitclub/details?url={quote(movie_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"])  # Movie details with HubCloud links`;
        } else if (selectedCategory.name === "HubCloud Links") {
          return `# Get HubCloud streaming links
import requests
from urllib.parse import quote

hubcloud_url = "https://hubcloud.lol/file/xyz123"
url = f"${baseUrl}/api/hubcloud?url={quote(hubcloud_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["links"])  # Direct streaming/download links`;
        }

      case "curl":
        if (selectedCategory.name === "Get Movies") {
          return `# Get movies from 10BitClub
curl -X GET \\
  "${baseUrl}/api/10bitclub" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"

# With pagination
curl -X GET \\
  "${baseUrl}/api/10bitclub?page=2" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Search Movies") {
          return `# Search movies on 10BitClub
curl -X GET \\
  "${baseUrl}/api/10bitclub?search=avengers" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Movie Details") {
          return `# Get movie details from 10BitClub
curl -X GET \\
  "${baseUrl}/api/10bitclub/details?url=https%3A//10bitclub.xyz/avengers-endgame-2019/" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "HubCloud Links") {
          return `# Get HubCloud streaming links
curl -X GET \\
  "${baseUrl}/api/hubcloud?url=https%3A//hubcloud.lol/file/xyz123" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        }

      default:
        return "";
    }
  };

  const getResponseExample = (category: string) => {
    switch (category) {
      case "Get Movies":
        return `{
  "success": true,
  "count": 20,
  "posts": [
    {
      "imageUrl": "https://10bitclub.xyz/wp-content/uploads/2024/01/avengers-endgame.jpg",
      "title": "Avengers: Endgame (2019) Tamil Dubbed Movie",
      "postUrl": "https://10bitclub.xyz/avengers-endgame-2019/",
      "rating": "8.4",
      "year": "2019",
      "quality": "1080p",
      "featured": true
    },
    {
      "imageUrl": "https://10bitclub.xyz/wp-content/uploads/2024/01/spider-man.jpg",
      "title": "Spider-Man: No Way Home (2021) Tamil Dubbed",
      "postUrl": "https://10bitclub.xyz/spider-man-no-way-home-2021/",
      "rating": "8.2",
      "year": "2021",
      "quality": "720p",
      "featured": false
    }
  ],
  "page": 1,
  "source": "page",
  "remainingRequests": 95
}`;

      case "Search Movies":
        return `{
  "success": true,
  "count": 5,
  "posts": [
    {
      "imageUrl": "https://10bitclub.xyz/wp-content/uploads/2024/01/avengers-endgame.jpg",
      "title": "Avengers: Endgame (2019) Tamil Dubbed Movie",
      "postUrl": "https://10bitclub.xyz/avengers-endgame-2019/",
      "rating": "8.4",
      "year": "2019",
      "quality": "1080p",
      "featured": true
    },
    {
      "imageUrl": "https://10bitclub.xyz/wp-content/uploads/2023/12/avengers-infinity-war.jpg",
      "title": "Avengers: Infinity War (2018) Tamil Dubbed",
      "postUrl": "https://10bitclub.xyz/avengers-infinity-war-2018/",
      "rating": "8.4",
      "year": "2018",
      "quality": "1080p",
      "featured": false
    }
  ],
  "searchQuery": "avengers",
  "source": "search",
  "remainingRequests": 94
}`;

      case "Movie Details":
        return `{
  "success": true,
  "data": {
    "title": "Avengers: Endgame (2019) Tamil Dubbed Movie",
    "posterImage": "https://10bitclub.xyz/wp-content/uploads/2024/01/avengers-endgame.jpg",
    "releaseDate": "2019",
    "country": "USA",
    "runtime": "181 min",
    "rating": "8.4/10",
    "synopsis": "After the devastating events of Avengers: Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more in order to reverse Thanos' actions and restore balance to the universe.",
    "hubCloudSections": [
      {
        "title": "Avengers Endgame (2019) Tamil Dubbed 1080p BluRay x264 2.8GB",
        "quality": "1080p",
        "fileSize": "2.8GB",
        "language": "Tamil",
        "hubCloudLinks": [
          {
            "url": "https://hubcloud.lol/file/abc123",
            "text": "HubCloud Link 1"
          },
          {
            "url": "https://hubcloud.lol/file/def456",
            "text": "HubCloud Link 2"
          }
        ]
      },
      {
        "title": "Avengers Endgame (2019) Tamil Dubbed 720p BluRay x264 1.4GB",
        "quality": "720p",
        "fileSize": "1.4GB",
        "language": "Tamil",
        "hubCloudLinks": [
          {
            "url": "https://hubcloud.lol/file/ghi789",
            "text": "HubCloud Link 1"
          }
        ]
      }
    ],
    "tags": ["Action", "Adventure", "Drama", "Sci-Fi"],
    "totalHubCloudLinks": 3,
    "downloadSectionsCount": 2
  },
  "sourceUrl": "https://10bitclub.xyz/avengers-endgame-2019/",
  "remainingRequests": 93
}`;

      case "HubCloud Links":
        return `{
  "success": true,
  "links": [
    {
      "quality": "1080p",
      "size": "2.8GB",
      "link": "https://gpdl.hubcdn.fans/d/abc123/Avengers-Endgame-2019-Tamil-1080p.mp4",
      "server": "HubCloud Server 1",
      "type": "MP4",
      "isDirect": true
    },
    {
      "quality": "1080p",
      "size": "2.8GB",
      "link": "https://gpdl2.hubcdn.fans/d/abc123/Avengers-Endgame-2019-Tamil-1080p.mp4",
      "server": "HubCloud Server 2",
      "type": "MP4",
      "isDirect": true
    },
    {
      "quality": "720p",
      "size": "1.4GB",
      "link": "https://gpdl.hubcdn.fans/d/abc123/Avengers-Endgame-2019-Tamil-720p.mp4",
      "server": "HubCloud Server 1",
      "type": "MP4",
      "isDirect": true
    }
  ],
  "totalLinks": 3,
  "sourceUrl": "https://hubcloud.lol/file/abc123",
  "remainingRequests": 92
}`;

      default:
        return "{}";
    }
  };

  return (
    <Tabs defaultValue="test" className="space-y-4 sm:space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="test" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
          <Play className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">API Testing</span>
          <span className="xs:hidden">Testing</span>
        </TabsTrigger>
        <TabsTrigger value="docs" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
          <Code2 className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Code Examples</span>
          <span className="xs:hidden">Examples</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="test" className="space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Film className="h-5 w-5 text-blue-500" />
              10BitClub API Testing
            </CardTitle>
            <CardDescription className="text-sm">
              Enter your API key to test the 10BitClub endpoints. Get your API key from the{" "}
              <a href="/dashboard/api-keys" className="text-primary hover:underline">
                API Keys page
              </a>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="password"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                className="flex-1 text-sm min-w-0"
              />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(apiKey)} className="shrink-0 self-start sm:self-auto">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">API Categories</CardTitle>
              <CardDescription className="text-sm">Select a category and endpoint to test</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Category</Label>
                <Select value={selectedCategory.name} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tenBitClubApiCategories.map((category) => (
                      <SelectItem key={category.name} value={category.name} className="text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                          {category.icon}
                          <span className="truncate">{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Endpoint</Label>
                <Select value={selectedEndpoint.endpoint} onValueChange={handleEndpointChange}>
                  <SelectTrigger className="text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCategory.endpoints.map((endpoint) => (
                      <SelectItem key={endpoint.endpoint} value={endpoint.endpoint} className="text-sm">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={endpoint.method === "GET" ? "default" : "secondary"} className="text-xs shrink-0">
                              {endpoint.method}
                            </Badge>
                            <code className="text-xs truncate min-w-0">{endpoint.endpoint}</code>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={`p-3 rounded-lg border-l-4 ${selectedCategory.color} bg-muted/50`}>
                <p className="text-xs sm:text-sm text-muted-foreground break-words">{selectedEndpoint.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Parameters</CardTitle>
              <CardDescription className="text-sm">
                Configure parameters for <code className="text-xs break-all">{selectedEndpoint.endpoint}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {selectedEndpoint.params && selectedEndpoint.params.length > 0 ? (
                selectedEndpoint.params.map((param) => (
                  <div key={param.name} className="space-y-2">
                    <Label htmlFor={param.name} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="break-words">{param.name}</span>
                      <Badge variant={param.required ? "destructive" : "secondary"} className="text-xs shrink-0">
                        {param.required ? "Required" : "Optional"}
                      </Badge>
                      <span className="text-xs text-muted-foreground shrink-0">({param.type})</span>
                    </Label>
                    <Input
                      id={param.name}
                      placeholder={param.description}
                      value={testParams[param.name] || ""}
                      onChange={(e) => setTestParams({ ...testParams, [param.name]: e.target.value })}
                      className="text-sm w-full min-w-0"
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No parameters required</p>
              )}

              <Button onClick={testApi} disabled={loading} className="w-full text-sm">
                {loading ? "Testing..." : "Test API"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Response</CardTitle>
            <CardDescription className="text-sm">API response will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            {response ? (
              <ColorizedJSON data={response} title="api-response" />
            ) : (
              <div className="bg-muted rounded-lg p-8 text-center">
                <p className="text-muted-foreground">API response will appear here...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="docs" className="space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Film className="h-5 w-5 text-blue-500" />
              10BitClub API Examples
            </CardTitle>
            <CardDescription className="text-sm">
              Code examples for integrating with our 10BitClub API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2 min-w-0">
                <Label className="text-sm">Category</Label>
                <Select value={selectedCategory.name} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tenBitClubApiCategories.map((category) => (
                      <SelectItem key={category.name} value={category.name} className="text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                          {category.icon}
                          <span className="truncate">{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 min-w-0">
                <Label className="text-sm">Endpoint</Label>
                <Select value={selectedEndpoint.endpoint} onValueChange={handleEndpointChange}>
                  <SelectTrigger className="text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCategory.endpoints.map((endpoint) => (
                      <SelectItem key={endpoint.endpoint} value={endpoint.endpoint} className="text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant={endpoint.method === "GET" ? "default" : "secondary"} className="text-xs shrink-0">
                            {endpoint.method}
                          </Badge>
                          <code className="text-xs truncate min-w-0">{endpoint.endpoint}</code>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="javascript" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="javascript" className="text-xs sm:text-sm">JavaScript</TabsTrigger>
                <TabsTrigger value="python" className="text-xs sm:text-sm">Python</TabsTrigger>
                <TabsTrigger value="curl" className="text-xs sm:text-sm">cURL</TabsTrigger>
              </TabsList>

              <TabsContent value="javascript">
                <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                  <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex gap-1.5 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                      </div>
                      <span className="text-gray-300 text-sm ml-2 truncate">10bitclub.js</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2 shrink-0"
                      onClick={() => copyToClipboard(generateCodeExample("javascript"))}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <pre className="p-4">
                      <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
                        {generateCodeExample("javascript")}
                      </code>
                    </pre>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="python">
                <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                  <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex gap-1.5 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                      </div>
                      <span className="text-gray-300 text-sm ml-2 truncate">10bitclub.py</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2 shrink-0"
                      onClick={() => copyToClipboard(generateCodeExample("python"))}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <pre className="p-4">
                      <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
                        {generateCodeExample("python")}
                      </code>
                    </pre>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="curl">
                <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                  <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex gap-1.5 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                      </div>
                      <span className="text-gray-300 text-sm ml-2 truncate">terminal</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2 shrink-0"
                      onClick={() => copyToClipboard(generateCodeExample("curl"))}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <pre className="p-4">
                      <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
                        {generateCodeExample("curl")}
                      </code>
                    </pre>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Response Examples</CardTitle>
            <CardDescription className="text-sm">Expected response structures for 10BitClub endpoints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="movies" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="movies" className="text-xs sm:text-sm">Movies List</TabsTrigger>
                <TabsTrigger value="search" className="text-xs sm:text-sm">Search Results</TabsTrigger>
                <TabsTrigger value="details" className="text-xs sm:text-sm">Movie Details</TabsTrigger>
                <TabsTrigger value="hubcloud" className="text-xs sm:text-sm">HubCloud</TabsTrigger>
              </TabsList>

              <TabsContent value="movies">
                <ColorizedJSON data={getResponseExample("Get Movies")} title="movies-list" />
              </TabsContent>

              <TabsContent value="search">
                <ColorizedJSON data={getResponseExample("Search Movies")} title="search-results" />
              </TabsContent>

              <TabsContent value="details">
                <ColorizedJSON data={getResponseExample("Movie Details")} title="movie-details" />
              </TabsContent>

              <TabsContent value="hubcloud">
                <ColorizedJSON data={getResponseExample("HubCloud Links")} title="hubcloud-links" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
