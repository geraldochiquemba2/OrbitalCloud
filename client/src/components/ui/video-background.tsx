import { useState, useRef, useEffect } from "react";

export default function VideoBackground({ 
  videoSrc, 
  posterSrc,
  className = "",
  onLoad
}: { 
  videoSrc: string; 
  posterSrc: string;
  className?: string;
  onLoad?: () => void;
}) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoFailed) return;

    const handleCanPlay = () => {
      setVideoReady(true);
      if (onLoad) onLoad();
    };

    const handleLoadedData = () => {
      setVideoReady(true);
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleLoadedData);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [onLoad, videoFailed]);

  const handleVideoError = () => {
    setVideoFailed(true);
    if (onLoad) onLoad();
  };

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Poster image - always visible until video is ready */}
      <img 
        src={posterSrc} 
        alt="Background" 
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          videoReady && !videoFailed ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ zIndex: 1 }}
      />
      
      {/* Video - loads in background, fades in when ready */}
      {!videoFailed && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload={isMobile ? "metadata" : "auto"}
          onError={handleVideoError}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            videoReady ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ zIndex: 2 }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}
      
      {/* Overlay para garantir legibilidade do texto */}
      <div className="absolute inset-0 bg-black/30" style={{ zIndex: 3 }} />
    </div>
  );
}