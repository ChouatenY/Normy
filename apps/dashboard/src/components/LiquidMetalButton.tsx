import { useEffect, useRef, useState, type MouseEvent } from "react";

interface LiquidMetalButtonProps {
  label?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  width?: number | string;
  height?: number;
  type?: "button" | "submit";
  disabled?: boolean;
}

export function LiquidMetalButton({
  label,
  onClick,
  icon,
  width = 160,
  height = 46,
  type = "button",
  disabled = false,
}: LiquidMetalButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<
    Array<{ x: number; y: number; id: number }>
  >([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleId = useRef(0);

  useEffect(() => {
    const styleId = "liquid-metal-css-anims";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes lm-shimmer {
          0%   { background-position: 200% 50%; }
          100% { background-position: -200% 50%; }
        }
        @keyframes lm-ripple {
          0%   { transform: translate(-50%, -50%) scale(0); opacity: 0.55; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
        @keyframes lm-glow-pulse {
          0%, 100% { opacity: 0.45; }
          50%      { opacity: 0.75; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ripple = { x, y, id: rippleId.current++ };
      setRipples((prev) => [...prev, ripple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
      }, 600);
    }
    onClick?.();
  };

  const outerGlow = isHovered && !disabled
    ? "0 0 0 1px rgba(255,255,255,0.4), 0 8px 24px rgba(255,255,255,0.08), 0 2px 8px rgba(255,255,255,0.12)"
    : "0 0 0 1px rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.5)";

  const metalGradient = isHovered && !disabled
    ? "linear-gradient(135deg, #4a4a4a 0%, #8a8a8a 20%, #c0c0c0 35%, #ffffff 50%, #c0c0c0 65%, #8a8a8a 80%, #4a4a4a 100%)"
    : "linear-gradient(135deg, #2a2a2a 0%, #555 20%, #888 35%, #bbb 50%, #888 65%, #555 80%, #2a2a2a 100%)";

  const buttonWidth = typeof width === "number" ? `${width}px` : width;

  return (
    <div style={{ position: "relative", display: "inline-block", width: buttonWidth }}>
      <button
        ref={buttonRef}
        type={type}
        disabled={disabled}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        style={{
          position: "relative",
          width: "100%",
          height: `${height}px`,
          borderRadius: 100,
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          overflow: "hidden",
          backgroundImage: metalGradient,
          backgroundSize: "400% 100%",
          animation: disabled ? "none" : "lm-shimmer 4s linear infinite",
          boxShadow: outerGlow,
          transform: isPressed && !disabled ? "scale(0.97)" : "scale(1)",
          transition: "transform 0.15s ease, box-shadow 0.3s ease, background 0.3s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {/* Inner dark overlay for contrast */}
        <span
          style={{
            position: "absolute",
            inset: 2,
            borderRadius: 100,
            background: "linear-gradient(180deg, rgba(20,20,20,0.85) 0%, rgba(0,0,0,0.92) 100%)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Animated shimmer highlight */}
        {!disabled && (
          <span
            style={{
              position: "absolute",
              inset: 2,
              borderRadius: 100,
              background:
                "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 70%)",
              backgroundSize: "300% 100%",
              animation: "lm-shimmer 3s ease-in-out infinite",
              zIndex: 2,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Glow ring on hover */}
        {isHovered && !disabled && (
          <span
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: 100,
              background: "transparent",
              boxShadow: "inset 0 0 12px rgba(255,255,255,0.15), 0 0 20px rgba(255,255,255,0.06)",
              animation: "lm-glow-pulse 2s ease-in-out infinite",
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Icon */}
        {icon && (
          <span style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center" }}>
            {icon}
          </span>
        )}

        {/* Button content */}
        {label && (
          <span
            style={{
              position: "relative",
              zIndex: 3,
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              textShadow: "0 1px 3px rgba(0,0,0,0.7)",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        )}

        {/* Click ripples */}
        {!disabled && ripples.map((ripple) => (
          <span
            key={ripple.id}
            style={{
              position: "absolute",
              left: `${ripple.x}px`,
              top: `${ripple.y}px`,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 70%)",
              pointerEvents: "none",
              animation: "lm-ripple 0.6s ease-out",
              zIndex: 4,
            }}
          />
        ))}
      </button>
    </div>
  );
}
