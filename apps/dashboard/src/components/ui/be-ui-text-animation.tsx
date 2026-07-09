import React, { ElementType, ReactNode } from "react";

export interface TextShimmerProps {
  children: ReactNode;
  as?: ElementType;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function TextShimmer({
  children,
  as: Comp = "span",
  duration = 2.5,
  className,
  style,
}: TextShimmerProps) {
  return (
    <>
      <style>
        {`@keyframes beui-text-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}`}
      </style>
      <Comp
        style={{ 
          animation: `beui-text-shimmer ${duration}s linear infinite`,
          display: 'inline-block',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          backgroundImage: 'linear-gradient(110deg, var(--text-muted, #888) 30%, var(--white, #fff) 50%, var(--text-muted, #888) 70%)',
          ...style 
        }}
        className={className}
      >
        {children}
      </Comp>
    </>
  );
}
