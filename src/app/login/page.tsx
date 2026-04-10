"use client";

import { useState, useRef, useEffect } from "react";
import FaceScanner from "@/components/FaceScanner";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const isSubmitting = useRef(false);

  const handleScan = async (embedding: Float32Array) => {
    if (isSubmitting.current || status === "success") return;

    isSubmitting.current = true;
    setStatus("scanning");
    setMessage("Verifying Biometrics...");

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embedding: Array.from(embedding) }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(`Welcome back, ${data.user.name || data.user.email}!`);
        // Redirect or handle login session here
      } else {
        setStatus("error");
        setMessage(data.error || "Recognition failed");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch (err) {
      setStatus("error");
      setMessage("Biometric service unavailable");
      setTimeout(() => setStatus("idle"), 3000);
    } finally {
      isSubmitting.current = false;
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 space-y-12">
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-accent/20 text-accent text-sm font-medium"
        >
          <LogIn className="w-4 h-4" />
          Secure Access
        </motion.div>
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
          Face Unlock
        </h1>
        <p className="text-white/40 max-w-sm mx-auto">
          Position your face within the frame to securely access your workspace.
        </p>
      </div>

      <FaceScanner onScan={handleScan} status={status} message={message} />

      <div className="flex flex-col items-center gap-4">
        <Link 
          href="/register" 
          className="text-sm text-accent hover:text-accent/80 transition-colors"
        >
          Don't have a face record? Register here
        </Link>
      </div>
    </main>
  );
}
