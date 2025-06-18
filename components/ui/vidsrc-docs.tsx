"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Play, Code2, Video, Film, Tv, Monitor } from "lucide-react";
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

const vidsrcApiCategories: ApiCategory[] = [
  {
    name: "Movie Streaming",
    icon: <Film className="h-4 w-4" />,
    color: "bg-red-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/vidsrc",
        description: "Get direct streaming links for movies using TMDB ID",
        params: [
          { name: "id", type: "string", required: true, description: "TMDB Movie ID (e.g., 299536 for Avengers: Infinity War)" },
          { name: "type", type: "string", required: false, description: "Content type - use 'movie' (default)" }
        ]
      }
    ]
  },
  {
    name: "TV Series Streaming",
    icon: <Tv className="h-4 w-4" />,
    color: "bg-blue-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/vidsrc",
        description: "Get direct streaming links for TV series episodes using TMDB ID with season and episode",
        params: [
          { name: "id", type: "string", required: true, description: "TMDB TV Series ID (e.g., 94605 for Arcane)" },
          { name: "type", type: "string", required: true, description: "Content type - use 'tv'" },
          { name: "season", type: "number", required: true, description: "Season number (e.g., 1)" },
          { name: "episode", type: "number", required: true, description: "Episode number (e.g., 1)" }
        ]
      }
    ]
  }
];

interface VidSrcDocsProps {
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

export default function VidSrcDocs({ apiKey, onApiKeyChange }: VidSrcDocsProps) {
  const [selectedCategory, setSelectedCategory] = useState(vidsrcApiCategories[0]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(vidsrcApiCategories[0].endpoints[0]);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleCategoryChange = (categoryName: string) => {
    const category = vidsrcApiCategories.find(cat => cat.name === categoryName);
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
    const baseUrl = "https://totu.me";

    switch (language) {
      case "javascript":
        if (selectedCategory.name === "Movie Streaming") {
          return `// Get streaming URL for a movie using TMDB ID
const tmdbId = "299536"; // Avengers: Infinity War
const response = await fetch(\`${baseUrl}/api/vidsrc?id=\${tmdbId}&type=movie\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
if (data.success) {
  console.log("Stream URL:", data.data.streamUrl);
  console.log("Source:", data.data.source);
  
  // Use the stream URL in a video player
  const videoPlayer = document.getElementById('video-player');
  videoPlayer.src = data.data.streamUrl;
} else {
  console.error("Failed to get stream:", data.error);
}

// Popular movie TMDB IDs:
// - 299536: Avengers: Infinity War
// - 299534: Avengers: Endgame  
// - 634649: Spider-Man: No Way Home
// - 447365: Guardians of the Galaxy Vol. 3`;
        } else {
          return `// Get streaming URL for TV series episode using TMDB ID
const tmdbId = "94605"; // Arcane
const season = 1;
const episode = 1;

const response = await fetch(\`${baseUrl}/api/vidsrc?id=\${tmdbId}&type=tv&season=\${season}&episode=\${episode}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
if (data.success) {
  console.log("Stream URL:", data.data.streamUrl);
  console.log("Episode info:", \`S\${data.data.season}E\${data.data.episode}\`);
  
  // Use the stream URL in a video player
  const videoPlayer = document.getElementById('video-player');
  videoPlayer.src = data.data.streamUrl;
} else {
  console.error("Failed to get stream:", data.error);
}

// Popular TV series TMDB IDs:
// - 94605: Arcane
// - 85271: WandaVision
// - 88396: The Falcon and the Winter Soldier
// - 71712: The Boys`;
        }

      case "python":
        if (selectedCategory.name === "Movie Streaming") {
          return `# Get streaming URL for a movie using TMDB ID
import requests

tmdb_id = "299536"  # Avengers: Infinity War
url = f"${baseUrl}/api/vidsrc?id={tmdb_id}&type=movie"

headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()

if data["success"]:
    stream_url = data["data"]["streamUrl"]
    print(f"Stream URL: {stream_url}")
    print(f"Source: {data['data']['source']}")
    
    # You can now use stream_url in your video player
    # or download the stream
else:
    print(f"Failed to get stream: {data['error']}")

# Popular movie TMDB IDs:
# 299536: Avengers: Infinity War
# 299534: Avengers: Endgame  
# 634649: Spider-Man: No Way Home
# 447365: Guardians of the Galaxy Vol. 3`;
        } else {
          return `# Get streaming URL for TV series episode using TMDB ID
import requests

tmdb_id = "94605"  # Arcane
season = 1
episode = 1

url = f"${baseUrl}/api/vidsrc?id={tmdb_id}&type=tv&season={season}&episode={episode}"

headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()

if data["success"]:
    stream_url = data["data"]["streamUrl"]
    print(f"Stream URL: {stream_url}")
    print(f"Episode: S{data['data']['season']}E{data['data']['episode']}")
    
    # You can now use stream_url in your video player
else:
    print(f"Failed to get stream: {data['error']}")

# Popular TV series TMDB IDs:
# 94605: Arcane
# 85271: WandaVision
# 88396: The Falcon and the Winter Soldier
# 71712: The Boys`;
        }

      case "curl":
        if (selectedCategory.name === "Movie Streaming") {
          return `# Get streaming URL for a movie using TMDB ID
curl -X GET \\
  "${baseUrl}/api/vidsrc?id=299536&type=movie" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"

# Popular movie TMDB IDs:
# 299536: Avengers: Infinity War
# 299534: Avengers: Endgame  
# 634649: Spider-Man: No Way Home
# 447365: Guardians of the Galaxy Vol. 3`;
        } else {
          return `# Get streaming URL for TV series episode using TMDB ID
curl -X GET \\
  "${baseUrl}/api/vidsrc?id=94605&type=tv&season=1&episode=1" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"

# Popular TV series TMDB IDs:
# 94605: Arcane
# 85271: WandaVision
# 88396: The Falcon and the Winter Soldier
# 71712: The Boys`;
        }

      default:
        return "";
    }
  };

  const getResponseExample = (category: string) => {
    switch (category) {
      case "Movie Streaming":
        return `{
  "success": true,
  "data": {
    "streamUrl": "https://vidsrc-stream.net/playlist/299536/master.m3u8",
    "tmdbId": "299536",
    "type": "movie",
    "source": "vidsrc.icu"
  },
  "remainingRequests": 95
}`;

      case "TV Series Streaming":
        return `{
  "success": true,
  "data": {
    "streamUrl": "https://vidsrc-stream.net/playlist/94605/1/1/master.m3u8",
    "tmdbId": "94605",
    "type": "tv",
    "season": 1,
    "episode": 1,
    "source": "vidsrc.icu"
  },
  "remainingRequests": 94
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
              <Monitor className="h-5 w-5 text-red-500" />
              VidSrc API Testing
            </CardTitle>
            <CardDescription className="text-sm">
              Enter your API key to test the VidSrc streaming endpoints. Get your API key from the{" "}
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
              <CardDescription className="text-sm">Select content type to stream</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Content Type</Label>
                <Select value={selectedCategory.name} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vidsrcApiCategories.map((category) => (
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
                <p className="text-xs sm:text-sm text-muted-foreground break-words">{selectedEndpoint.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Parameters</CardTitle>
              <CardDescription className="text-sm">
                Configure TMDB ID and episode details for streaming
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
                {loading ? "Getting Stream..." : "Get Stream URL"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Response</CardTitle>
            <CardDescription className="text-sm">Streaming URL response will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            {response ? (
              <ColorizedJSON data={response} title="stream-response" />
            ) : (
              <div className="bg-muted rounded-lg p-8 text-center">
                <p className="text-muted-foreground">Stream response will appear here...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="docs" className="space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Monitor className="h-5 w-5 text-red-500" />
              VidSrc API Examples
            </CardTitle>
            <CardDescription className="text-sm">
              Code examples for integrating with our VidSrc streaming API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="space-y-2 min-w-0">
              <Label className="text-sm">Content Type</Label>
              <Select value={selectedCategory.name} onValueChange={handleCategoryChange}>
                <SelectTrigger className="text-sm w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vidsrcApiCategories.map((category) => (
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

              <TabsContent value="javascript">
                <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                  <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex gap-1.5 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                      </div>
                      <span className="text-gray-300 text-sm ml-2 truncate">vidsrc.js</span>
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
                      <span className="text-gray-300 text-sm ml-2 truncate">vidsrc.py</span>
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
            <CardDescription className="text-sm">Expected response structures for VidSrc streaming endpoints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="movie" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="movie" className="text-xs sm:text-sm">Movie Stream</TabsTrigger>
                <TabsTrigger value="tv" className="text-xs sm:text-sm">TV Episode Stream</TabsTrigger>
              </TabsList>

              <TabsContent value="movie">
                <ColorizedJSON data={getResponseExample("Movie Streaming")} title="movie-stream" />
              </TabsContent>

              <TabsContent value="tv">
                <ColorizedJSON data={getResponseExample("TV Series Streaming")} title="tv-stream" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">How to Use VidSrc API</CardTitle>
            <CardDescription className="text-sm">Step-by-step guide for streaming movies and TV shows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2 text-sm sm:text-base">Getting Started</h4>
              <ol className="text-xs sm:text-sm space-y-2">
                <li><strong>1. Get TMDB ID:</strong> Find the movie/TV series ID from themoviedb.org</li>
                <li><strong>2. Choose Type:</strong> Use "movie" for films or "tv" for series</li>
                <li><strong>3. For TV Shows:</strong> Specify season and episode numbers</li>
                <li><strong>4. Get Stream URL:</strong> API returns direct .m3u8 streaming link</li>
              </ol>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <Film className="h-4 w-4 text-red-500" />
                  Movie Streaming
                </h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• Use TMDB movie ID</li>
                  <li>• Set type to "movie"</li>
                  <li>• Get direct m3u8 stream URL</li>
                  <li>• Compatible with HLS players</li>
                </ul>
              </div>
              
              <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <Tv className="h-4 w-4 text-blue-500" />
                  TV Series Streaming
                </h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• Use TMDB series ID</li>
                  <li>• Set type to "tv"</li>
                  <li>• Specify season and episode</li>
                  <li>• Stream individual episodes</li>
                </ul>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
              <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                <Video className="h-4 w-4 text-green-500" />
                Stream URL Usage
              </h4>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p>• Returns HLS (.m3u8) streaming URLs</p>
                <p>• Compatible with HTML5 video players</p>
                <p>• Works with Video.js, HLS.js, and native players</p>
                <p>• Supports adaptive bitrate streaming</p>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-md">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> VidSrc API requires TMDB IDs, not IMDb IDs. You can find TMDB IDs on themoviedb.org or use the TMDB API to search and get IDs programmatically.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
