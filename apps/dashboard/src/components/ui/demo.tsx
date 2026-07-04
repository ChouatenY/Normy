import { Hero } from "./hero-1.js";

export default function DemoOne({ onCtaClick }: { onCtaClick?: () => void }) {
  return (
    <Hero 
      title="Build smarter tools for modern teams"
      subtitle="Streamline your workflow and boost productivity with intuitive solutions. Security, speed, and simplicity—all in one platform."
      eyebrow="Next-Gen Productivity"
      ctaLabel="Get Started"
      ctaHref="#"
      onCtaClick={onCtaClick}
    />
  );
}
