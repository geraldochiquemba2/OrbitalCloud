import { useEffect } from "react";
import dashboardBg from "@/assets/dashboard-bg.jpg";
import loadingBg from "@/assets/pexels-shkrabaanthony-5475785_1764342747703.jpg";

export default function ImagePreloader() {
  useEffect(() => {
    const preloadImages = async () => {
      const images = [dashboardBg, loadingBg];
      
      images.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    };

    preloadImages();
  }, []);

  return null;
}
