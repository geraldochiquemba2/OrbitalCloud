import { useState, useRef, useEffect, memo } from "react";

const VideoBackground = memo(function VideoBackground({ 
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
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    
    const timer = setTimeout(() => {
      setShouldLoadVideo(true);
    }, isMobile ? 500 : 200);
    
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoFailed || !shouldLoadVideo) return;

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
  }, [onLoad, videoFailed, shouldLoadVideo]);

  const handleVideoError = () => {
    setVideoFailed(true);
    if (onLoad) onLoad();
  };

  const transitionDuration = isMobile ? 'duration-200' : 'duration-300';

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <img 
        src={posterSrc} 
        alt="Background"
        loading="eager"
        decoding="async"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity ${transitionDuration} ${
          videoReady && !videoFailed ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ zIndex: 1 }}
      />
      
      {!videoFailed && shouldLoadVideo && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload={isMobile ? "none" : "metadata"}
          onError={handleVideoError}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity ${transitionDuration} ${
            videoReady ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ zIndex: 2 }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}
      
      <div className="absolute inset-0 bg-black/30" style={{ zIndex: 3 }} />
    </div>
  );
});

export default VideoBackground;