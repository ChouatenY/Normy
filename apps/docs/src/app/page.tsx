import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="hero">
      <div className="hero-card">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 16 }}>
          <div className="brand-mark">N</div>
          <span>Normy</span>
        </div>
        <h1>AI form validation that guides, not blocks</h1>
        <p>
          Normy sits between your forms and your database — validating input quality in real time
          and returning helpful, AI-generated feedback instead of generic errors.
        </p>
        <div className="hero-actions">
          <Link href="/docs/quickstart" className="btn btn-primary">Quick start</Link>
          <Link href="/docs/react" className="btn btn-ghost">React SDK</Link>
          <a href="https://github.com/normy/normy" className="btn btn-ghost">GitHub</a>
        </div>
      </div>
    </main>
  );
}
