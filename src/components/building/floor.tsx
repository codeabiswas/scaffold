"use client";

import { motion } from "framer-motion";

export function Floor({
  index,
  x,
  y,
  width,
  height,
  isNew,
}: {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isNew: boolean;
}) {
  // Alternate between primary and ring (Mauve / Lavender in Catppuccin)
  const color = index % 2 === 0 ? "var(--primary)" : "var(--ring)";
  const windowWidth = 20;
  const windowHeight = 15;
  const windowGap = 15;
  const windowY = y + (height - windowHeight) / 2;
  const numWindows = 4;
  const totalWindowsWidth =
    numWindows * windowWidth + (numWindows - 1) * windowGap;
  const windowStartX = x + (width - totalWindowsWidth) / 2;

  return (
    <motion.g
      initial={isNew ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        type: "spring",
        stiffness: 100,
      }}
    >
      {/* Floor block */}
      <rect x={x} y={y} width={width} height={height} fill={color} rx={1} />

      {/* Windows */}
      {Array.from({ length: numWindows }).map((_, wi) => (
        <motion.rect
          key={wi}
          x={windowStartX + wi * (windowWidth + windowGap)}
          y={windowY}
          width={windowWidth}
          height={windowHeight}
          fill="var(--background)"
          rx={2}
          initial={isNew ? { opacity: 0 } : { opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ delay: isNew ? 0.3 + wi * 0.1 : 0 }}
        />
      ))}

      {/* Floor separator */}
      <line
        x1={x}
        y1={y + height}
        x2={x + width}
        y2={y + height}
        stroke="var(--border)"
        strokeWidth={0.5}
      />
    </motion.g>
  );
}
