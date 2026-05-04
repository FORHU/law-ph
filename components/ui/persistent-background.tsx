'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

export function PersistentBackground() {
  const pathname = usePathname();
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [api, setApi] = useState<any>(null);
  const [annotationData, setAnnotationData] = useState<any[]>([]);
  const [targetAngle, setTargetAngle] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Map 1-5 angles to Sketchfab annotations (#8, #3, #5, #6, #4)
  const getAnnotationIndex = (angle: number) => {
    if (angle === 1) return 7; // #8 (Chat)
    if (angle === 2) return 2; // #3 (Documents)
    if (angle === 3) return 4; // #5 (Transcribe)
    if (angle === 4) return 5; // #6 (Calendar)
    if (angle === 5) return 3; // #4 (Mindmap)
    return 7;
  };

  useEffect(() => {
    // Listen for custom events dispatched by PageLayout or others
    const handleAngleChange = (e: CustomEvent) => {
      setTargetAngle(e.detail);
    };
    window.addEventListener('backgroundAngleChange', handleAngleChange as EventListener);
    return () => window.removeEventListener('backgroundAngleChange', handleAngleChange as EventListener);
  }, []);

  useEffect(() => {
    if (!api || annotationData.length === 0) return;
    
    const index = getAnnotationIndex(targetAngle);
    const data = annotationData[index];
    
    if (data && data.eye && data.target) {
      // Calculate a "3D Zoom" by moving the eye closer to the target
      // This prevents the blurriness caused by CSS scaling
      const zoomFactor = 0.45; // Move 45% closer
      const newEye = [
        data.eye[0] + (data.target[0] - data.eye[0]) * zoomFactor,
        data.eye[1] + (data.target[1] - data.eye[1]) * zoomFactor,
        data.eye[2] + (data.target[2] - data.eye[2]) * zoomFactor
      ];
      
      api.setCameraLookAt(newEye, data.target, 2.5);
    }
  }, [targetAngle, api, annotationData]);

  useEffect(() => {
    const initSketchfab = () => {
      if (!iframeRef.current || !(window as any).Sketchfab) return;
      
      const client = new (window as any).Sketchfab("1.12.1", iframeRef.current);
      
      client.init('d6b81ab3924443f99ae4542c6be4e1a6', {
        success: function onSuccess(apiData: any) {
          setApi(apiData);
          apiData.start();
            apiData.addEventListener('viewerready', function() {
              setIsLoaded(true);
              // Hide all individual pins since the global UI setting is being ignored
              apiData.getAnnotationList(function(err: any, annotations: any[]) {
                if (!err && annotations) {
                  // Hide all individual pins since the global UI setting is being ignored
                  annotations.forEach((_, index) => {
                    apiData.hideAnnotation(index);
                  });
                  setAnnotationData(annotations);
                // Initial position
                const firstIndex = getAnnotationIndex(targetAngle);
                if (annotations[firstIndex]) {
                  apiData.setCameraLookAt(annotations[firstIndex].eye, annotations[firstIndex].target, 0);
                }
              }
            });
          });
        },
        error: function onError() {
          console.error('Sketchfab API error');
        },
        autostart: 1,
        camera: 0,
        ui_animations: 0,
        ui_annotations: 0, // Keep this 0 to hide pins
        ui_controls: 0,
        ui_inspector: 0,
        ui_settings: 0,
        ui_vr: 0,
        ui_ar: 0,
        ui_help: 0,
        ui_loading: 0,
        ui_watermark: 0,
        ui_hint: 0,
        ui_infos: 0,
        ui_stop: 0,
        scrollwheel: 0,
        transparent: 1,
        preload: 1,
        dpr: 2 // Force high resolution (Device Pixel Ratio)
      });
    };

    if ((window as any).Sketchfab) {
      initSketchfab();
    } else {
      const interval = setInterval(() => {
        if ((window as any).Sketchfab) {
          clearInterval(interval);
          initSketchfab();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  // Use the 3D background everywhere
  const isAppRoute = true;

  if (!mounted) return null;

  return (
    <>
      <Script src="https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js" strategy="lazyOnload" />
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#0a0a0c]">
        
        {/* Loading Mask (Pure Black) */}
        <AnimatePresence>
          {!isLoaded && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0 bg-[#0a0a0c] z-[100]"
            />
          )}
        </AnimatePresence>

        {/* Sketchfab 3D Embed */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute inset-0 z-0"
        >
          <iframe 
            ref={iframeRef}
            title="Classic Library Background"
            className="w-[115%] h-[115%] absolute top-[-7.5%] left-[-7.5%] border-none opacity-40 brightness-75 contrast-125"
            allow="autoplay; fullscreen; xr-spatial-tracking"
          />
        </motion.div>

        {/* Global Cinematic Overlays */}
        <div className="absolute inset-0 bg-[#0a0a0c]/40 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0C]/90 via-transparent to-[#0B0B0C]" />
        
        {/* Ambient "Sovereign" Glows */}
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-[rgba(233,193,118,0.03)] blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-[rgba(114,47,55,0.05)] blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
      </div>
    </>
  );
}
