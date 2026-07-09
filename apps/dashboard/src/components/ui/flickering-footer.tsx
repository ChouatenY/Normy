"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Github, Twitter, Linkedin } from "lucide-react";

// Helper functions to avoid color-bits dependency
export const getRGBA = (cssColor: string, fallback: string = "rgba(180, 180, 180, 1)"): string => {
  if (typeof window === "undefined") return fallback;
  if (!cssColor) return fallback;

  try {
    if (cssColor.startsWith("var(")) {
      return fallback; // Avoid dangerous DOM manipulation during render
    }

    if (cssColor.startsWith("#")) {
      const hex = cssColor.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, 1)`;
    }

    return cssColor;
  } catch (e) {
    return fallback;
  }
};

export const colorWithOpacity = (color: string, opacity: number): string => {
  if (color.startsWith("rgba")) {
    return color.replace(/rgba\((.*?),(.*?),(.*?),(.*?)\)/, `rgba($1,$2,$3,${opacity})`);
  }
  if (color.startsWith("rgb")) {
    return color.replace(/rgb\((.*?),(.*?),(.*?)\)/, `rgba($1,$2,$3,${opacity})`);
  }
  return color;
};

interface FlickeringGridProps extends React.HTMLAttributes<HTMLDivElement> {
  squareSize?: number;
  gridGap?: number;
  flickerChance?: number;
  color?: string;
  width?: number;
  height?: number;
  maxOpacity?: number;
  text?: string;
  fontSize?: number;
  fontWeight?: number | string;
}

export const FlickeringGrid: React.FC<FlickeringGridProps> = ({
  squareSize = 3,
  gridGap = 3,
  flickerChance = 0.2,
  color = "#B4B4B4",
  width,
  height,
  className,
  maxOpacity = 0.15,
  text = "",
  fontSize = 140,
  fontWeight = 600,
  ...props
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const memoizedColor = useMemo(() => getRGBA(color), [color]);

  const drawGrid = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      cols: number,
      rows: number,
      squares: Float32Array,
      dpr: number,
    ) => {
      ctx.clearRect(0, 0, width, height);

      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
      if (!maskCtx) return;

      if (text) {
        maskCtx.save();
        maskCtx.scale(dpr, dpr);
        maskCtx.fillStyle = "white";
        maskCtx.font = `${fontWeight} ${fontSize}px "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        maskCtx.textAlign = "center";
        maskCtx.textBaseline = "middle";
        maskCtx.fillText(text, width / (2 * dpr), height / (2 * dpr));
        maskCtx.restore();
      }

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * (squareSize + gridGap) * dpr;
          const y = j * (squareSize + gridGap) * dpr;
          const squareWidth = squareSize * dpr;
          const squareHeight = squareSize * dpr;

          const maskData = maskCtx.getImageData(x, y, squareWidth, squareHeight).data;
          const hasText = maskData.some((value, index) => index % 4 === 0 && value > 0);

          const opacity = squares[i * rows + j];
          const finalOpacity = hasText ? Math.min(1, opacity * 3 + 0.4) : opacity;

          ctx.fillStyle = colorWithOpacity(memoizedColor, finalOpacity);
          ctx.fillRect(x, y, squareWidth, squareHeight);
        }
      }
    },
    [memoizedColor, squareSize, gridGap, text, fontSize, fontWeight],
  );

  const setupCanvas = useCallback(
    (canvas: HTMLCanvasElement, width: number, height: number) => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const cols = Math.ceil(width / (squareSize + gridGap));
      const rows = Math.ceil(height / (squareSize + gridGap));

      const squares = new Float32Array(cols * rows);
      for (let i = 0; i < squares.length; i++) {
        squares[i] = Math.random() * maxOpacity;
      }

      return { cols, rows, squares, dpr };
    },
    [squareSize, gridGap, maxOpacity],
  );

  const updateSquares = useCallback(
    (squares: Float32Array, deltaTime: number) => {
      for (let i = 0; i < squares.length; i++) {
        if (Math.random() < flickerChance * deltaTime) {
          squares[i] = Math.random() * maxOpacity;
        }
      }
    },
    [flickerChance, maxOpacity],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let gridParams: ReturnType<typeof setupCanvas>;

    const updateCanvasSize = () => {
      const newWidth = width || container.clientWidth;
      const newHeight = height || container.clientHeight;
      setCanvasSize({ width: newWidth, height: newHeight });
      gridParams = setupCanvas(canvas, newWidth, newHeight);
    };

    updateCanvasSize();

    let lastTime = 0;
    const animate = (time: number) => {
      if (!isInView) return;

      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      updateSquares(gridParams.squares, deltaTime);
      drawGrid(ctx, canvas.width, canvas.height, gridParams.cols, gridParams.rows, gridParams.squares, gridParams.dpr);
      animationFrameId = requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(() => updateCanvasSize());
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), { threshold: 0 });
    intersectionObserver.observe(canvas);

    if (isInView) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [setupCanvas, updateSquares, drawGrid, width, height, isInView]);

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%' }} className={className} {...props}>
      <canvas ref={canvasRef} style={{ pointerEvents: 'none', width: canvasSize.width, height: canvasSize.height }} />
    </div>
  );
};

export const siteConfig = {
  hero: {
    description: "Normy is an AI assistant designed to streamline your digital workflows and handle mundane tasks, so you can focus on what truly matters.",
  },
  footerLinks: [
    {
      title: "Company",
      links: [
        { id: 1, title: "About", url: "#" },
        { id: 2, title: "Contact", url: "#" },
        { id: 3, title: "Blog", url: "#" },
        { id: 4, title: "Story", url: "#" },
      ],
    },
    {
      title: "Products",
      links: [
        { id: 5, title: "Sandbox", url: "#" },
        { id: 6, title: "Dashboard", url: "/dashboard" },
        { id: 7, title: "Pricing", url: "#" },
      ],
    },
    {
      title: "Resources",
      links: [
        { id: 9, title: "Documentation", url: "#" },
        { id: 10, title: "Careers", url: "#" },
        { id: 11, title: "Support", url: "#" },
      ],
    },
  ],
};

export const FlickeringFooter = () => {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkQuery = () => setIsTablet(window.innerWidth <= 1024);
    checkQuery();
    window.addEventListener("resize", checkQuery);
    return () => window.removeEventListener("resize", checkQuery);
  }, []);

  return (
    <footer style={{ width: '100%', paddingTop: 40 }}>
      <div style={{ display: 'flex', flexDirection: isTablet ? 'column' : 'row', alignItems: isTablet ? 'flex-start' : 'center', justifyContent: 'space-between', padding: '0 40px', maxWidth: 1200, margin: '0 auto', gap: 40, paddingBottom: 64 }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 20, maxWidth: 320 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/logo.png" alt="Normy" style={{ height: 28 }} />
          </Link>
          <p style={{ color: 'var(--text-sec)', fontSize: '0.9375rem', lineHeight: 1.6, fontWeight: 500 }}>
            {siteConfig.hero.description}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
            <a href="https://github.com/ChouatenY/Normy" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)' }}>
              <Github size={24} />
            </a>
            <a href="#" style={{ color: 'var(--text-muted)' }}>
              <Twitter size={24} />
            </a>
            <a href="#" style={{ color: 'var(--text-muted)' }}>
              <Linkedin size={24} />
            </a>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: isTablet ? 40 : 80 }}>
          {siteConfig.footerLinks.map((column, columnIndex) => (
            <ul key={columnIndex} style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <li style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--white)', marginBottom: 8 }}>
                {column.title}
              </li>
              {column.links.map((link) => (
                <li key={link.id}>
                  <Link href={link.url} style={{ color: 'var(--text-sec)', textDecoration: 'none', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {link.title}
                    <ChevronRight size={14} style={{ opacity: 0.5 }} />
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
      {/* Streamline Workflow Flickering Grid (Monochrome) */}
      <div style={{ width: '100%', height: isTablet ? 192 : 256, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #000 0%, transparent 100%)', zIndex: 10, pointerEvents: 'none' }} />
        <FlickeringGrid
          squareSize={4}
          gridGap={4}
          color="#888888" // Pure monochrome grey, no blue tint
          maxOpacity={0.25}
          flickerChance={0.1}
          text="Streamline your workflow"
          fontSize={isTablet ? 60 : 100}
        />
      </div>
    </footer>
  );
};
