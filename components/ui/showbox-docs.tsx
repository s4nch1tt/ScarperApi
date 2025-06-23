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
import { Copy, Play, Code2, Search, Video, Download, Info, PlayCircle } from "lucide-react";
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

const showboxApiCategories: ApiCategory[] = [
  {
    name: "Search Movies/TV",
    icon: <Search className="h-4 w-4" />,
    color: "bg-blue-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/showbox",
        description: "Search for movies and TV shows on Showbox or get homepage content",
        params: [
          { name: "search", type: "string", required: false, description: "Search query (movie/TV show title)" },
          { name: "keyword", type: "string", required: false, description: "Alternative search parameter" },
          { name: "filter", type: "string", required: false, description: "Category filter (/movie, /tv)" },
          { name: "page", type: "number", required: false, description: "Page number (default: 1)" }
        ]
      }
    ]
  },
  {
    name: "Movie/TV Details",
    icon: <Info className="h-4 w-4" />,
    color: "bg-green-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/showbox/details",
        description: "Get detailed information including file links and metadata",
        params: [
          { name: "url", type: "string", required: true, description: "Showbox movie/TV show URL (e.g., https://www.showbox.media/movie/m-avengers-endgame)" }
        ]
      }
    ]
  },
  {
    name: "TV Series Episodes",
    icon: <Video className="h-4 w-4" />,
    color: "bg-red-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/showbox/series",
        description: "Get TV series episodes using episode ID and file ID (specifically for TV shows)",
        params: [
          { name: "episode_id", type: "string", required: true, description: "Episode share key (e.g., vzqprWJd)" },
          { name: "file_id", type: "string", required: true, description: "File/parent ID (e.g., 2798715)" }
        ]
      }
    ]
  },
  {
    name: "Episode Files",
    icon: <Video className="h-4 w-4" />,
    color: "bg-purple-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/showbox/episodes",
        description: "Get episode file list from febbox file share",
        params: [
          { name: "id", type: "string", required: true, description: "File share key (e.g., Dl28MRMd)" }
        ]
      }
    ]
  },
  {
    name: "Stream Links",
    icon: <PlayCircle className="h-4 w-4" />,
    color: "bg-orange-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/showbox/stream",
        description: "Get streaming URLs with quality options",
        params: [
          { name: "id", type: "string", required: true, description: "Episode file ID (e.g., Dl28MRMd&24207012)" }
        ]
      }
    ]
  }
];

interface ShowboxDocsProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export default function ShowboxDocs({ apiKey, onApiKeyChange }: ShowboxDocsProps) {
  const [selectedCategory, setSelectedCategory] = useState(showboxApiCategories[0]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(showboxApiCategories[0].endpoints[0]);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleCategoryChange = (categoryName: string) => {
    const category = showboxApiCategories.find(cat => cat.name === categoryName);
    if (category) {
      setSelectedCategory(category);
      setSelectedEndpoint(category.endpoints[0]);
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
    const queryParams = params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&");
    if (queryParams) {
      url += "?" + queryParams;
    }

    switch (language) {
      case "javascript":
        if (selectedCategory.name === "Search Movies/TV") {
          return `// Search for movies/TV shows
const searchQuery = "avengers";
const response = await fetch("${baseUrl}/api/showbox?search=" + encodeURIComponent(searchQuery), {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.items); // Array of movies/TV shows
console.log(data.data.items[0].postUrl); // Get detail URL for next step`;
        } else if (selectedCategory.name === "Movie/TV Details") {
          return `// Get movie/TV details (Step 1)
const movieUrl = "https://www.showbox.media/movie/m-avengers-endgame";
const response = await fetch("${baseUrl}/api/showbox/details?url=" + encodeURIComponent(movieUrl), {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.linkList); // File links
// Use episodesLink for next step
const episodesLink = data.data.linkList[0].episodesLink; // e.g., "vzqprWJd&2798715"`;
        } else if (selectedCategory.name === "TV Series Episodes") {
          return `// Get TV series episodes (Step 2 - For TV Shows)
const episodesLink = "vzqprWJd&2798715"; // from details
const [episodeId, fileId] = episodesLink.split('&');

const response = await fetch("${baseUrl}/api/showbox/series?episode_id=" + episodeId + "&file_id=" + fileId, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.file_list); // List of TV episodes
// Use file ID for streaming
const fileId = data.data.file_list[0].fid;`;
        } else if (selectedCategory.name === "Episode Files") {
          return `// Get episode files (Step 2 - For Movies)
const fileShareKey = "Dl28MRMd"; // from details episodesLink
const response = await fetch("${baseUrl}/api/showbox/episodes?id=" + fileShareKey, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.file_list); // List of episode files
// Use file ID for streaming
const fileId = data.data.file_list[0].fid; // e.g., 24207012`;
        } else {
          return `// Get streaming URLs (Step 3)
const episodeId = "Dl28MRMd&24207012"; // fileShareKey + "&" + fileId
const response = await fetch("${baseUrl}/api/showbox/stream?id=" + encodeURIComponent(episodeId), {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.streams); // Streaming URLs with quality options`;
        }

      case "python":
        if (selectedCategory.name === "Search Movies/TV") {
          return `# Search for movies/TV shows
import requests
from urllib.parse import quote

search_query = "avengers"
url = f"${baseUrl}/api/showbox?search={quote(search_query)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["items"])  # Array of movies/TV shows`;
        } else if (selectedCategory.name === "Movie/TV Details") {
          return `# Get movie/TV details (Step 1)
import requests
from urllib.parse import quote

movie_url = "https://www.showbox.media/movie/m-avengers-endgame"
url = f"${baseUrl}/api/showbox/details?url={quote(movie_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["linkList"])  # File links`;
        } else if (selectedCategory.name === "TV Series Episodes") {
          return `# Get TV series episodes (Step 2 - For TV Shows)
import requests

episodes_link = "vzqprWJd&2798715"  # from details
episode_id, file_id = episodes_link.split('&')

url = f"${baseUrl}/api/showbox/series?episode_id={episode_id}&file_id={file_id}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["file_list"])  # List of TV episodes`;
        } else if (selectedCategory.name === "Episode Files") {
          return `# Get episode files (Step 2 - For Movies)
import requests

file_share_key = "Dl28MRMd"  # from details episodesLink
url = f"${baseUrl}/api/showbox/episodes?id={file_share_key}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["file_list"])  # List of episode files`;
        } else {
          return `# Get streaming URLs (Step 3)
import requests
from urllib.parse import quote

episode_id = "Dl28MRMd&24207012"  # fileShareKey + "&" + fileId
url = f"${baseUrl}/api/showbox/stream?id={quote(episode_id)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["streams"])  # Streaming URLs with quality options`;
        }

      case "curl":
        if (selectedCategory.name === "Search Movies/TV") {
          return `# Search for movies/TV shows
curl -X GET \\
  "${baseUrl}/api/showbox?search=avengers" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Movie/TV Details") {
          return `# Get movie/TV details (Step 1)
curl -X GET \\
  "${baseUrl}/api/showbox/details?url=https%3A//www.showbox.media/movie/m-avengers-endgame" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "TV Series Episodes") {
          return `# Get TV series episodes (Step 2 - For TV Shows)
curl -X GET \\
  "${baseUrl}/api/showbox/series?episode_id=vzqprWJd&file_id=2798715" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Episode Files") {
          return `# Get episode files (Step 2)
curl -X GET \\
  "${baseUrl}/api/showbox/episodes?id=Dl28MRMd" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else {
          return `# Get streaming URLs (Step 3)
curl -X GET \\
  "${baseUrl}/api/showbox/stream?id=Dl28MRMd%2624207012" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        }

      default:
        return "";
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
              <Video className="h-5 w-5 text-blue-500" />
              Showbox API Testing
            </CardTitle>
            <CardDescription className="text-sm">
              Enter your API key to test the Showbox endpoints.
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
                    {showboxApiCategories.map((category) => (
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

              <div className={`p-3 rounded-lg border-l-4 ${selectedCategory.color} bg-muted/50`}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="text-xs">
                    {selectedEndpoint.method}
                  </Badge>
                  <code className="text-xs">{selectedEndpoint.endpoint}</code>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground break-words">{selectedEndpoint.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Parameters</CardTitle>
              <CardDescription className="text-sm">
                Configure parameters for the endpoint
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
            <div className="w-full overflow-hidden">
              <Textarea
                placeholder="API response will appear here..."
                value={response}
                readOnly
                className="min-h-[200px] sm:min-h-[300px] font-mono text-xs sm:text-sm w-full resize-none"
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="docs" className="space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-500" />
              Showbox API Examples
            </CardTitle>
            <CardDescription className="text-sm">
              Code examples for integrating with the Showbox API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <Label className="text-sm">Category</Label>
              <Select value={selectedCategory.name} onValueChange={handleCategoryChange}>
                <SelectTrigger className="text-sm w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {showboxApiCategories.map((category) => (
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

            <Tabs defaultValue="javascript" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="javascript" className="text-xs sm:text-sm">JavaScript</TabsTrigger>
                <TabsTrigger value="python" className="text-xs sm:text-sm">Python</TabsTrigger>
                <TabsTrigger value="curl" className="text-xs sm:text-sm">cURL</TabsTrigger>
              </TabsList>

              {["javascript", "python", "curl"].map((lang) => (
                <TabsContent key={lang} value={lang}>
                  <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                    <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex gap-1.5 shrink-0">
                          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                        </div>
                        <span className="text-gray-300 text-sm ml-2 truncate">
                          showbox.{lang === "javascript" ? "js" : lang === "python" ? "py" : "sh"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2 shrink-0"
                        onClick={() => copyToClipboard(generateCodeExample(lang))}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <pre className="p-4">
                        <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
                          {generateCodeExample(lang)}
                        </code>
                      </pre>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">API Workflow</CardTitle>
            <CardDescription className="text-sm">Step-by-step process to get streaming links</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg">
              <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                <Download className="h-4 w-4 text-blue-500" />
                Complete Workflow
              </h4>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="text-xs shrink-0">1</Badge>
                  <div>
                    <strong>Search:</strong> Use <code>/api/showbox?search=avengers</code> to find movies/TV shows
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="text-xs shrink-0">2</Badge>
                  <div>
                    <strong>Details:</strong> Use <code>/api/showbox/details?url=postUrl</code> to get file links
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="text-xs shrink-0">3</Badge>
                  <div>
                    <strong>Episodes:</strong> Use <code>/api/showbox/episodes?id=episodesLink</code> to get file list
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="text-xs shrink-0">4</Badge>
                  <div>
                    <strong>Stream:</strong> Use <code>/api/showbox/stream?id=fileKey&fileId</code> to get streaming URLs
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">Features</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• High-quality movie and TV content</li>
                  <li>• Multiple streaming quality options</li>
                  <li>• Direct febbox integration</li>
                  <li>• Series episode management</li>
                </ul>
              </div>
              
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">Supported Formats</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• 480p, 720p, 1080p, 4K</li>
                  <li>• MKV video format</li>
                  <li>• Various file sizes</li>
                  <li>• Multiple server options</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
