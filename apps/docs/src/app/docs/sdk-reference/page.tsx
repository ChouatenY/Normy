import { CodeBlock, DocsShell } from '@/components/DocsShell';

export default function SdkReferencePage() {
  return (
    <DocsShell activePath="/docs/sdk-reference">
      <h1>SDK reference</h1>
      <p className="lead">Packages published to npm under the <code>@normy</code> scope.</p>

      <h2>@normy/react</h2>
      <table>
        <thead><tr><th>Export</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>NormyProvider</code></td><td>Component</td><td>Context provider (apiKey, projectId, defaults)</td></tr>
          <tr><td><code>NormyTextarea</code></td><td>Component</td><td>Validated textarea + toast</td></tr>
          <tr><td><code>NormyInput</code></td><td>Component</td><td>Validated input + toast</td></tr>
          <tr><td><code>NormySelect</code></td><td>Component</td><td>Validated select + toast</td></tr>
          <tr><td><code>NormyToast</code></td><td>Component</td><td>Standalone feedback toast</td></tr>
          <tr><td><code>useValidation</code></td><td>Hook</td><td>Headless validation state machine</td></tr>
          <tr><td><code>useNormy</code></td><td>Hook</td><td>Access provider context</td></tr>
          <tr><td><code>NormyClient</code></td><td>Class</td><td>Direct API client</td></tr>
        </tbody>
      </table>

      <h3>NormyProvider props</h3>
      <table>
        <thead><tr><th>Prop</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>apiKey</code></td><td>—</td><td><code>nrm_live_...</code> or <code>nrm_test_...</code></td></tr>
          <tr><td><code>projectId</code></td><td>—</td><td>UUID from Normy dashboard</td></tr>
          <tr><td><code>defaultMode</code></td><td><code>onPause</code></td><td>Default validation trigger</td></tr>
          <tr><td><code>pauseMs</code></td><td><code>2000</code></td><td>Debounce for onPause mode</td></tr>
          <tr><td><code>apiUrl</code></td><td><code>https://api.normy.dev</code></td><td>Self-hosted API URL</td></tr>
        </tbody>
      </table>

      <h2>@normy/js</h2>
      <CodeBlock>{`import { createNormy, NormyClient } from '@normy/js';

const client = new NormyClient({ apiKey: '...', baseUrl: '...' });
const result = await client.validate({ projectId, question, answer });`}</CodeBlock>

      <h3>NormyClient.validate()</h3>
      <p>Returns a discriminated union:</p>
      <CodeBlock>{`type NormyApiResult =
  | { ok: true;  data: ValidateResponse }
  | { ok: false; error: { error: string; status: number } };`}</CodeBlock>
    </DocsShell>
  );
}
