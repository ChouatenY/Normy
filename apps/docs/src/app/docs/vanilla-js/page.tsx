import { CodeBlock, DocsShell } from '@/components/DocsShell';

export default function VanillaJsPage() {
  return (
    <DocsShell activePath="/docs/vanilla-js">
      <h1>Vanilla JavaScript</h1>
      <p className="lead">Use <code>@normy/js</code> in any framework or plain HTML forms.</p>

      <h2>Install</h2>
      <CodeBlock>{`npm install @normy/js`}</CodeBlock>

      <h2>Validate on demand</h2>
      <CodeBlock>{`import { createNormy } from '@normy/js';

const normy = createNormy({
  apiKey: 'nrm_test_...',
  baseUrl: 'http://localhost:3001',
});

const result = await normy.validate({
  projectId: 'your-project-id',
  question: 'Why are you cancelling?',
  answer: document.querySelector('#reason').value,
});

if (result.ok && !result.data.valid) {
  showToast(result.data.feedback, result.data.severity);
}`}</CodeBlock>

      <h2>Debounced onPause pattern</h2>
      <CodeBlock>{`const input = document.querySelector('#reason');
let timer;

input.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const result = await normy.validate({
      projectId: PROJECT_ID,
      question: 'Why are you cancelling?',
      answer: input.value,
    });
    if (result.ok) renderFeedback(result.data);
  }, 2000);
});`}</CodeBlock>

      <h2>Response shape</h2>
      <CodeBlock>{`{
  "valid": false,
  "score": 18,
  "confidence": 0.92,
  "issue": "IRRELEVANT_RESPONSE",
  "severity": "warning",
  "feedback": "Your answer doesn't appear related to the cancellation reason."
}`}</CodeBlock>
    </DocsShell>
  );
}
