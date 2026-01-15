import DomeGallery from "@/components/DomeGallery";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

async function getTrendingMovies() {
  const response = await fetch(
    `https://api.themoviedb.org/3/trending/all/week?api_key=5a209f099efaba1cd26a904e09b90829`,
    { next: { revalidate: 3600 } }
  );
  
  if (!response.ok) {
    return [];
  }
  
  const data = await response.json();
  return data.results || [];
}

export default async function Home() {
  const trending = await getTrendingMovies();
  
  const images = trending.slice(0, 50).map((item: any) => ({
    src: item.poster_path 
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : `https://image.tmdb.org/t/p/w500${item.backdrop_path}`,
    alt: item.title || item.name || "Movie Poster"
  }));

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 font-sans overflow-hidden">
      {/* Login/Signup Buttons */}
       <div className="fixed top-6 left-6 z-50">
          <Image
            src="/logo.svg" 
            alt="Logo" 
            width={40} 
            height={40}
            priority
          />
        </div>
      <div className="fixed top-6 right-6 z-50 flex gap-3">
        <Link href="/login">
          <Button variant="outline" size="default">
            Login
          </Button>
        </Link>
        <Link href="/signup">
          <Button variant="default" size="default">
            Sign Up
          </Button>
        </Link>
      </div>

      <div className="absolute inset-0 w-full h-full">
        <DomeGallery 
          images={images}
          fit={0.6}
          segments={35}
          grayscale={false}
          imageBorderRadius="12px"
          openedImageBorderRadius="16px"
          openedImageWidth="500px"
          openedImageHeight="750px"
          overlayBlurColor="#060010"
          autoRotate={true}
          autoRotateSpeed={0.15}
        />
      </div>
    </div>
  );
}
