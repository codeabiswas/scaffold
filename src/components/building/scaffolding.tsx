"use client";

/**
 * Construction scaffolding overlay — thin gray grid lines
 * with vertical standards, horizontal ledgers, and diagonal braces.
 */
export function Scaffolding({
  x,
  y,
  width,
  height,
  baseY,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  baseY: number;
}) {
  const poleSpacing = 28;
  const levelSpacing = 40;
  const gridColor = "#9ca0b0"; // Catppuccin Overlay0 – subtle gray
  const thinStroke = 0.7;
  const mediumStroke = 1.1;

  const numPoles = Math.floor(width / poleSpacing) + 1;
  const numLevels = Math.floor(height / levelSpacing) + 1;

  return (
    <g opacity={0.5}>
      {/* Vertical standards (poles at regular intervals) */}
      {Array.from({ length: numPoles }).map((_, i) => {
        const px = x + i * poleSpacing;
        if (px > x + width + 1) return null;
        return (
          <line
            key={`v-${i}`}
            x1={px}
            y1={y}
            x2={px}
            y2={baseY}
            stroke={gridColor}
            strokeWidth={mediumStroke}
          />
        );
      })}

      {/* Horizontal ledgers */}
      {Array.from({ length: numLevels }).map((_, i) => {
        const ly = baseY - i * levelSpacing;
        if (ly < y) return null;
        return (
          <line
            key={`h-${i}`}
            x1={x}
            y1={ly}
            x2={x + width}
            y2={ly}
            stroke={gridColor}
            strokeWidth={mediumStroke}
          />
        );
      })}

      {/* Diagonal braces — alternating direction per bay */}
      {Array.from({ length: numPoles - 1 }).map((_, col) => {
        const leftX = x + col * poleSpacing;
        const rightX = Math.min(x + (col + 1) * poleSpacing, x + width);
        return Array.from({ length: numLevels - 1 }).map((_, row) => {
          const topY = baseY - (row + 1) * levelSpacing;
          const bottomY = baseY - row * levelSpacing;
          if (topY < y) return null;
          const goRight = (col + row) % 2 === 0;
          return (
            <line
              key={`d-${col}-${row}`}
              x1={goRight ? leftX : rightX}
              y1={topY}
              x2={goRight ? rightX : leftX}
              y2={bottomY}
              stroke={gridColor}
              strokeWidth={thinStroke}
            />
          );
        });
      })}

      {/* Top rail */}
      <line
        x1={x}
        y1={y}
        x2={x + width}
        y2={y}
        stroke={gridColor}
        strokeWidth={mediumStroke}
      />
    </g>
  );
}
