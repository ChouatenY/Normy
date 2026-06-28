import { CodeBlock, DocsShell } from '@/components/DocsShell';

export default function ApiReferencePage() {
  return (
    <DocsShell activePath="/docs/api-reference">
      <h1>API reference</h1>
      <p className="lead">Normy REST API — base URL <code>https://api.normy.dev</code> (or your self-hosted instance).</p>

      <h2>Authentication</h2>
      <p>All requests require a project API key:</p>
      <CodeBlock>{`Authorization: Bearer nrm_live_...`}</CodeBlock>

      <h2>POST /validate</h2>
      <p>Validate a single question/answer pair.</p>

      <h3>Request</h3>
      <CodeBlock>{`POST /validate
Content-Type: application/json
Authorization: Bearer nrm_test_...

{
  "projectId": "uuid-of-your-project",
  "question": "Why are you cancelling?",
  "answer": "pizza"
}`}</CodeBlock>

      <h3>Response (200)</h3>
      <CodeBlock>{`{
  "valid": false,
  "score": 18,
  "confidence": 0.91,
  "issue": "IRRELEVANT_RESPONSE",
  "severity": "warning",
  "feedback": "Your answer doesn't appear related to the cancellation reason.",
  "feedbackCategory": "content_quality"
}`}</CodeBlock>

      <h3>Issue codes</h3>
      <table>
        <thead><tr><th>Issue</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>RANDOM_TEXT</code></td><td>Keyboard mashing (asdf, sksksk)</td></tr>
          <tr><td><code>TOO_SHORT</code></td><td>Extremely short (no, idk, ok)</td></tr>
          <tr><td><code>EMPTY</code></td><td>No semantic content</td></tr>
          <tr><td><code>IRRELEVANT_RESPONSE</code></td><td>Answer unrelated to question</td></tr>
          <tr><td><code>CONTRADICTORY_RESPONSE</code></td><td>Self-contradicting answer</td></tr>
          <tr><td><code>SPAM</code></td><td>Spam-like repetition</td></tr>
          <tr><td><code>LOW_QUALITY</code></td><td>Vague or low-effort</td></tr>
          <tr><td><code>VALID</code></td><td>Passes quality threshold</td></tr>
        </tbody>
      </table>

      <h3>Errors</h3>
      <table>
        <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td>401</td><td>Invalid or missing API key</td></tr>
          <tr><td>403</td><td>Project ID mismatch</td></tr>
          <tr><td>429</td><td>Rate limit exceeded</td></tr>
        </tbody>
      </table>

      <h2>GET /health</h2>
      <CodeBlock>{`{ "status": "healthy" }`}</CodeBlock>

      <h2>Interactive docs</h2>
      <p>When running the API locally, open Swagger UI at <code>http://localhost:3001/docs</code>.</p>
    </DocsShell>
  );
}
