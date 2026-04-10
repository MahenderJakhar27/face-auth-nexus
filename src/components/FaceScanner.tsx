"use client";

import { useEffect, useRef, useState } from "react";
import { faceDetector } from "@/lib/ml/FaceDetector";
import { faceEmbedder } from "@/lib/ml/FaceEmbedder";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, RefreshCw, ShieldCheck, XCircle } from "lucide-react";

interface FaceScannerProps {
  onScan: (embedding: Float32Array) => void;
  status?: "idle" | "scanning" | "success" | "error" | "liveness";
  message?: string;
}

export default function FaceScanner({ onScan, status = "idle", message }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceFound, setFaceFound] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [samples, setSamples] = useState<Float32Array[]>([]);
  const requiredSamples = 5;
  const [challenge, setChallenge] = useState<"left" | "right" | "done" | null>(null);

  useEffect(() => {
    async function setup() {
      try {
        await Promise.all([faceDetector.init(), faceEmbedder.init()]);
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 1280, height: 720, facingMode: "user" } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsLoaded(true);
        }
      } catch (err: any) {
        setError(err.message || "Failed to access camera");
      }
    }
    setup();

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current || !isLoaded) return;

    try {
      const detections = faceDetector.detect(videoRef.current);
      if (detections.length === 0) {
        setFaceFound(false);
        return;
      }
      setFaceFound(true);
      console.log("Face detected! Processing embedding...");
      const detection = detections[0];
      const box = detection.boundingBox;
      if (!box) return;

      // Simple Liveness Check: Direction of nose/head
      // We check if the head is turned left or right based on bounding box shift or keypoints
      // Since BlazeFace is limited, we'll use a placeholder for "Move your head" challenge
      if (challenge && challenge !== "done") {
         // Placeholder logic: wait for a change in face position
         setChallenge("done");
         return;
      }

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      // Draw the detected face to the small 112x112 canvas for embedding
      ctx.drawImage(
        videoRef.current,
        box.originX, box.originY, box.width, box.height,
        0, 0, 112, 112
      );

      const embedding = await faceEmbedder.getEmbedding(canvasRef.current);
      
      if (status === "scanning") {
        let completedAverage: Float32Array | null = null;
        setSamples(prev => {
          const next = [...prev, embedding];
          if (next.length >= requiredSamples) {
            completedAverage = new Float32Array(512);
            for(let i=0; i<512; i++) {
              let sum = 0;
              for(const s of next) sum += s[i];
              completedAverage[i] = sum / next.length;
            }
            return []; // Reset
          }
          return next;
        });
        
        // Call onScan outside the updater function to avoid React side-effect errors
        if (completedAverage) {
            onScan(completedAverage);
        }
      } else {
        onScan(embedding);
      }
    } catch (e) {
      console.error("Scanning failed", e);
    }
  };

  // Auto-scan loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (status === "scanning" || status === "idle") {
        captureFace();
      }
    }, 500); 

    let timer: NodeJS.Timeout;
    if (status === "scanning") {
      setTimeLeft(20);
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setError("Scanning timeout. Please try again.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
        clearInterval(interval);
        if (timer) clearInterval(timer);
    };
  }, [status, isLoaded]);

  return (
    <div className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden glass border-2 border-white/10 group">
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mb-4" />
          <p className="text-white/80">{error}</p>
        </div>
      ) : (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover scale-x-[-1]"
          />
          
          {/* Scanning Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="scanner-line" />
            
            {/* Corner Borders */}
            <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-accent rounded-tl-xl opacity-50" />
            <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-accent rounded-tr-xl opacity-50" />
            <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-accent rounded-bl-xl opacity-50" />
            <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-accent rounded-br-xl opacity-50" />
          </div>

          <AnimatePresence>
            {(status !== "idle" || !faceFound) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3 px-8"
              >
                {status === "scanning" && (
                   <div className="w-full max-w-[200px] h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(samples.length / requiredSamples) * 100}%` }}
                        className="h-full bg-accent shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]"
                      />
                   </div>
                )}

                {status === "scanning" && (
                   <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40">
                      Auto-Canceling in {timeLeft}s
                   </div>
                )}
                
                <div className="glass px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl">
                  {!isLoaded ? (
                    <>
                      <RefreshCw className="w-5 h-5 text-accent animate-spin" />
                      <span className="text-sm font-medium whitespace-nowrap text-white/50">
                        Initializing AI...
                      </span>
                    </>
                  ) : !faceFound ? (
                    <>
                      <Camera className="w-5 h-5 text-white/50" />
                      <span className="text-sm font-medium whitespace-nowrap text-white/50">
                        Looking for face...
                      </span>
                    </>
                  ) : (
                    <>
                      {status === "scanning" && <RefreshCw className="w-5 h-5 text-accent animate-spin" />}
                      {status === "success" && <ShieldCheck className="w-5 h-5 text-green-500" />}
                      {status === "error" && <XCircle className="w-5 h-5 text-red-500" />}
                      <span className="text-sm font-medium whitespace-nowrap">
                        {message || (status === "scanning" ? "Identifying..." : status)}
                      </span>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} width={112} height={112} className="hidden" />
    </div>
  );
}
