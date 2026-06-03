import { Check, Minus } from "lucide-react";

interface StatusIconProps {
  name: string;
  color: string;
  isDone: boolean;
  size?: number;
}

/**
 * Renders a ClickUp-style status circle:
 * - To Do:        empty circle
 * - In Progress:  half-filled circle
 * - In Review:    3/4 filled circle
 * - Blocked:      circle with dash
 * - Done:         circle with checkmark
 */
export function StatusIcon({ name, color, isDone, size = 16 }: StatusIconProps) {
  const borderWidth = size >= 16 ? 2 : 1.5;
  const r = size / 2;

  // Done → checkmark
  if (isDone) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
        }}
      >
        <Check
          className="text-white"
          style={{ width: size * 0.6, height: size * 0.6 }}
          strokeWidth={3}
        />
      </span>
    );
  }

  const lowerName = name.toLowerCase();

  // Blocked → circle with dash
  if (lowerName === "blocked") {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full border-2"
        style={{
          width: size,
          height: size,
          borderColor: color,
        }}
      >
        <Minus
          style={{ width: size * 0.55, height: size * 0.55, color }}
          strokeWidth={3}
        />
      </span>
    );
  }

  // In Progress → half filled (left half)
  if (lowerName === "in progress") {
    return (
      <svg width={size} height={size} className="shrink-0">
        <circle
          cx={r}
          cy={r}
          r={r - borderWidth / 2}
          fill="none"
          stroke={color}
          strokeWidth={borderWidth}
        />
        {/* Left half fill */}
        <path
          d={`M ${r} ${borderWidth} A ${r - borderWidth} ${r - borderWidth} 0 0 0 ${r} ${size - borderWidth}`}
          fill={color}
        />
      </svg>
    );
  }

  // In Review → 3/4 filled
  if (lowerName === "in review") {
    return (
      <svg width={size} height={size} className="shrink-0">
        <circle
          cx={r}
          cy={r}
          r={r - borderWidth / 2}
          fill="none"
          stroke={color}
          strokeWidth={borderWidth}
        />
        {/* 3/4 fill: from top, going clockwise 270deg */}
        <path
          d={`M ${r} ${borderWidth}
              A ${r - borderWidth} ${r - borderWidth} 0 0 1 ${r} ${size - borderWidth}
              A ${r - borderWidth} ${r - borderWidth} 0 0 1 ${borderWidth} ${r}
              L ${r} ${r} Z`}
          fill={color}
        />
      </svg>
    );
  }

  // Default (To Do) → empty circle
  return (
    <span
      className="inline-flex shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        border: `${borderWidth}px solid ${color}`,
      }}
    />
  );
}
