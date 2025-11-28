import { useState } from "react";

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

  const handleVideoCanPlay = () => {
    if (onLoad) {
      onLoad();
    }
  };

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {!videoFailed ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          onError={() => setVideoFailed(true)}
          onCanPlay={handleVideoCanPlay}
          poster={posterSrc}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={videoSrc} type="video/mp4" />
          <img src={posterSrc} alt="Fallback" className="absolute inset-0 w-full h-full object-cover" />
        </video>
      ) : (
        <img 
          src={posterSrc} 
          alt="Cloud Storage" 
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      
      {/* Overlay para garantir legibilidade do texto */}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
}