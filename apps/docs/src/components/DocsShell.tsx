import Link from 'next/link';
import { DOC_SECTIONS } from '@/lib/nav';

export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="code-block">
      <code>{children.trim()}</code>
    </pre>
  );
}

export function DocsShell({
  activePath,
  children,
}: {
  activePath: string;
  children: React.ReactNode;
}) {
  return (
    <div className="docs-shell">
      <aside className="docs-sidebar">
        <Link href="/" className="brand">
          <div className="brand-mark">N</div>
          <span>Normy Docs</span>
        </Link>
        {DOC_SECTIONS.map((section) => (
          <div key={section.title} className="nav-group">
            <div className="nav-label">{section.title}</div>
            {section.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link${activePath === link.href ? ' active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </aside>
      <article className="docs-main">{children}</article>
    </div>
  );
}
