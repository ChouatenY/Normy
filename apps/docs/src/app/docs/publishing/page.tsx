import { CodeBlock, DocsShell } from '@/components/DocsShell';

export default function PublishingPage() {
  return (
    <DocsShell activePath="/docs/publishing">
      <h1>Publishing SDKs to npm</h1>
      <p className="lead">How to publish <code>@normy/react</code> and <code>@normy/js</code> so users can install them.</p>

      <h2>Package names</h2>
      <CodeBlock>{`npm install @normy/react
npm install @normy/js`}</CodeBlock>
      <p>
        Packages are scoped under <code>@normy</code>. You need an npm organization named <code>normy</code>
        (or change the scope in each package&apos;s <code>package.json</code>).
      </p>

      <h2>Build before publish</h2>
      <p>SDK packages compile TypeScript to <code>dist/</code>:</p>
      <CodeBlock>{`pnpm turbo build --filter=@normy/react --filter=@normy/js

# Verify dist output
ls packages/sdk-react/dist
ls packages/sdk-js/dist`}</CodeBlock>

      <h2>Manual publish (maintainers)</h2>
      <CodeBlock>{`npm login
pnpm publish --filter @normy/react --access public
pnpm publish --filter @normy/js --access public`}</CodeBlock>

      <h2>CI publish (recommended)</h2>
      <p>The repo includes <code>.github/workflows/publish.yml</code>:</p>
      <ol>
        <li>Create an npm access token with publish rights</li>
        <li>Add <code>NPM_TOKEN</code> to GitHub repository secrets</li>
        <li>Trigger via GitHub Release, or manually via Actions → Publish SDK</li>
      </ol>

      <h2>Versioning</h2>
      <p>Bump version in both SDK <code>package.json</code> files, then publish:</p>
      <CodeBlock>{`# packages/sdk-react/package.json
# packages/sdk-js/package.json
"version": "0.1.1"`}</CodeBlock>

      <h2>What gets published</h2>
      <p>Only <code>dist/</code> and <code>README.md</code> are included (see <code>files</code> field). Source stays in the monorepo.</p>

      <div className="callout">
        Before first publish, claim the <code>@normy</code> npm scope and verify package names are available.
      </div>
    </DocsShell>
  );
}
