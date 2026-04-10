"use client";

import { useState, useRef } from "react";
import FaceScanner from "@/components/FaceScanner";
import { motion } from "framer-motion";
import { UserPlus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const isSubmitting = useRef(false);

  const handleRegister = async (embedding: Float32Array) => {
    if (!email) {
      setMessage("Please enter your email first");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
      return;
    }

    if (isSubmitting.current || status === "success") return;

    isSubmitting.current = true;
    setStatus("scanning");
    setMessage("Analyzing Biometrics...");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          name, 
          embedding: Array.from(embedding) 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("Registration Complete!");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setStatus("error");
        setMessage(data.error || "Capture failed");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch (err) {
      setStatus("error");
      setMessage("Connection error");
      setTimeout(() => setStatus("idle"), 3000);
    } finally {
      isSubmitting.current = false;
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center py-12 px-6 space-y-10">
      <div className="w-full max-w-md">
        <Link href="/login" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        <div className="space-y-2 mb-10">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold"
          >
            <UserPlus className="w-3 h-3" />
            ENROLLMENT
          </motion.div>
          <h1 className="text-4xl font-bold">Register Face</h1>
          <p className="text-white/40">Enter your details and scan your face to create your biometric identity.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 focus:ring-2 focus:ring-accent outline-none transition-all placeholder:text-white/20"
            />
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 focus:ring-2 focus:ring-accent outline-none transition-all placeholder:text-white/20"
            />
          </div>

          <div className="flex flex-col items-center gap-6">
             <FaceScanner 
                onScan={handleRegister} 
                status={status === "idle" ? "idle" : status} 
                message={message} 
             />
             
             {status === "idle" && (
                <button
                  onClick={() => {
                    if (!email) {
                      setMessage("Please enter your email first");
                      setStatus("error");
                      setTimeout(() => setStatus("idle"), 2000);
                    } else {
                      setStatus("scanning");
                      setMessage("Waiting for face...");
                    }
                  }}
                  className="w-full py-4 rounded-xl bg-accent text-white font-bold shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all active:scale-95"
                >
                  Start Biometric Enrollment
                </button>
             )}
             
             <p className="text-xs text-center text-white/30 max-w-[280px]">
                Once you click start, look directly at the camera. Your face will be converted into a mathematical template.
             </p>
          </div>
        </div>
      </div>
    </main>
  );
}
