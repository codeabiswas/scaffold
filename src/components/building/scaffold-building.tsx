"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Floor } from "./floor";
import { Scaffolding } from "./scaffolding";

function getProgressMessage(floors: number): string {
  if (floors === 0) return "Break ground on your first check-in!";
  if (floors === 1) return "The first brick has been laid!";
  if (floors <= 3) return "The foundation is taking shape";
  if (floors <= 5) return "Your structure grows stronger every day";
  if (floors <= 7) return "The walls are rising — keep building!";
  if (floors <= 9) return "The skyline is starting to change";
  if (floors <= 11) return "Almost touching the clouds";
  if (floors <= 14) return "A towering achievement!";
  return "Reaching for the stars!";
}

/** Small stick-figure construction worker with orange hard hat */
function Worker({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Hard hat */}
      <rect x={x - 5} y={y} width={10} height={3} rx={1} fill="#fe640b" />
      <rect x={x - 3.5} y={y + 2} width={7} height={2} rx={0.5} fill="#fe640b" />
      {/* Head */}
      <circle cx={x} cy={y + 7} r={3} fill="none" stroke="var(--foreground)" strokeWidth={1.5} />
      {/* Body */}
      <line x1={x} y1={y + 10} x2={x} y2={y + 19} stroke="var(--foreground)" strokeWidth={1.5} />
      {/* Arms */}
      <line x1={x - 6} y1={y + 14} x2={x + 6} y2={y + 14} stroke="var(--foreground)" strokeWidth={1.5} />
      {/* Legs */}
      <line x1={x} y1={y + 19} x2={x - 5} y2={y + 26} stroke="var(--foreground)" strokeWidth={1.5} />
      <line x1={x} y1={y + 19} x2={x + 5} y2={y + 26} stroke="var(--foreground)" strokeWidth={1.5} />
    </g>
  );
}

export function ScaffoldBuilding({
  floors,
  phase,
  showScaffolding = true,
}: {
  floors: number;
  phase: number;
  showScaffolding?: boolean;
}) {
  const floorHeight = 40;
  const foundationHeight = 40;
  const groundThickness = 12;
  const buildingWidth = 180;
  const buildingX = 70;
  const craneTopPadding = 55;

  const visibleFloors = Math.max(floors, 3);
  const buildingAreaHeight = visibleFloors * floorHeight + foundationHeight;
  const svgHeight = buildingAreaHeight + groundThickness + craneTopPadding + 20;
  const svgWidth = 370;

  const groundY = svgHeight - 15;
  const foundationTopY = groundY - groundThickness - foundationHeight;

  function floorY(i: number) {
    return foundationTopY - (i + 1) * floorHeight;
  }

  const topFloorY = floors > 0 ? floorY(floors - 1) : foundationTopY;
  const craneArmY = craneTopPadding - 20;

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full max-w-sm"
        style={{ maxHeight: 480 }}
      >
        {/* Ground */}
        <rect
          x={0}
          y={groundY - groundThickness}
          width={svgWidth}
          height={groundThickness + 20}
          fill="var(--muted)"
          rx={2}
        />
        {/* Little grass patches */}
        <circle cx={15} cy={groundY - groundThickness - 1} r={3} fill="var(--muted)" />
        <circle cx={svgWidth - 20} cy={groundY - groundThickness - 1} r={4} fill="var(--muted)" />

        {/* Building foundation */}
        <rect
          x={buildingX}
          y={foundationTopY}
          width={buildingWidth}
          height={foundationHeight}
          fill="var(--primary)"
          rx={2}
        />
        <text
          x={buildingX + buildingWidth / 2}
          y={foundationTopY + foundationHeight / 2 + 4}
          textAnchor="middle"
          fontSize={11}
          fill="var(--primary-foreground)"
          fontWeight="bold"
          fontFamily="var(--font-sans), system-ui, sans-serif"
        >
          SCAFFOLD
        </text>

        {/* Floors */}
        <AnimatePresence>
          {Array.from({ length: floors }).map((_, i) => (
            <Floor
              key={i}
              index={i}
              x={buildingX}
              y={floorY(i)}
              width={buildingWidth}
              height={floorHeight - 2}
              isNew={i === floors - 1}
            />
          ))}
        </AnimatePresence>

        {/* Scaffolding grid overlay */}
        {showScaffolding && phase === 2 && floors > 0 && (
          <Scaffolding
            x={buildingX - 14}
            y={topFloorY}
            width={buildingWidth + 28}
            height={groundY - groundThickness - topFloorY}
            baseY={groundY - groundThickness}
          />
        )}

        {/* Construction Crane */}
        {phase === 2 && (
          <g opacity={0.65}>
            {/* Crane mast (vertical tower) */}
            <rect
              x={buildingX + buildingWidth + 18}
              y={craneArmY}
              width={6}
              height={groundY - groundThickness - craneArmY}
              fill="var(--muted-foreground)"
              rx={1}
            />
            {/* Crane jib (horizontal arm extending over building) */}
            <rect
              x={buildingX + 15}
              y={craneArmY}
              width={buildingWidth + 8}
              height={4}
              fill="var(--muted-foreground)"
              rx={1}
            />
            {/* Counter-jib (extends to the right) */}
            <rect
              x={buildingX + buildingWidth + 24}
              y={craneArmY}
              width={30}
              height={4}
              fill="var(--muted-foreground)"
              rx={1}
            />
            {/* Counterweight block */}
            <rect
              x={buildingX + buildingWidth + 40}
              y={craneArmY - 6}
              width={14}
              height={10}
              fill="var(--muted-foreground)"
              rx={2}
            />
            {/* Cable dangling from jib */}
            <line
              x1={buildingX + buildingWidth / 2}
              y1={craneArmY + 4}
              x2={buildingX + buildingWidth / 2}
              y2={Math.max(topFloorY - 12, craneArmY + 20)}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
              strokeDasharray="3 2"
            />
            {/* Hook at cable end */}
            <path
              d={`M${buildingX + buildingWidth / 2 - 3},${Math.max(topFloorY - 12, craneArmY + 20)} a3,3 0 1,0 6,0`}
              fill="none"
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
            />
            {/* Diagonal support stays on mast */}
            <line
              x1={buildingX + buildingWidth + 21}
              y1={craneArmY + 4}
              x2={buildingX + buildingWidth + 10}
              y2={craneArmY + 50}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
              opacity={0.5}
            />
          </g>
        )}

        {/* Stick-figure construction Workers */}
        {phase === 2 && (
          <g>
            {/* Worker on the left of building (ground level) */}
            <Worker x={32} y={groundY - groundThickness - 28} />
            {/* Worker on top floor of building */}
            {floors > 0 && (
              <Worker
                x={buildingX + buildingWidth - 30}
                y={topFloorY - 28}
              />
            )}
            {/* Worker on the right (ground, near crane base) */}
            <Worker
              x={buildingX + buildingWidth + 50}
              y={groundY - groundThickness - 28}
            />
          </g>
        )}
      </svg>

      <div className="mt-3 text-center">
        <p className="text-sm font-medium">{getProgressMessage(floors)}</p>
        {phase === 2 && (
          <p className="text-xs text-muted-foreground mt-1">
            Scaffolding supports your building until the habit is automatic
          </p>
        )}
      </div>
    </div>
  );
}
