"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScaffoldBuilding } from "./scaffold-building";

export function RevealAnimation({
  floors,
  onComplete,
}: {
  floors: number;
  onComplete?: () => void;
}) {
  const [phase, setPhase] = useState<"scaffolded" | "removing" | "revealed">(
    "scaffolded"
  );

  useEffect(() => {
    // Start removal after a brief pause
    const timer1 = setTimeout(() => setPhase("removing"), 1500);
    const timer2 = setTimeout(() => {
      setPhase("revealed");
      onComplete?.();
    }, 3500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {phase === "scaffolded" && (
          <motion.div key="scaffolded" exit={{ opacity: 0 }}>
            <ScaffoldBuilding floors={floors} phase={2} showScaffolding />
          </motion.div>
        )}
        {phase === "removing" && (
          <motion.div
            key="removing"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
          >
            <ScaffoldBuilding floors={floors} phase={2} showScaffolding />
            {/* Overlay that wipes away the scaffolding */}
            <motion.div
              className="absolute inset-0 bg-background"
              initial={{ clipPath: "inset(100% 0 0 0)" }}
              animate={{ clipPath: "inset(0 0 0 0)" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              style={{ mixBlendMode: "destination-out" as React.CSSProperties["mixBlendMode"] }}
            />
          </motion.div>
        )}
        {phase === "revealed" && (
          <motion.div
            key="revealed"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
          >
            <ScaffoldBuilding
              floors={floors}
              phase={4}
              showScaffolding={false}
            />
            <motion.p
              className="text-center text-lg font-semibold mt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Your building stands on its own.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
