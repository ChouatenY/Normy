import { CodeBlock, DocsShell } from '@/components/DocsShell';

export default function ReactPage() {
  return (
    <DocsShell activePath="/docs/react">
      <h1>React integration</h1>
      <p className="lead">Use <code>@normy/react</code> components for real-time validation with inline toast feedback.</p>

      <h2>Install</h2>
      <CodeBlock>{`npm install @normy/react`}</CodeBlock>

      <h2>Provider</h2>
      <p>Wrap your app (or form section) with <code>NormyProvider</code>:</p>
      <CodeBlock>{`<NormyProvider
  apiKey="nrm_test_..."
  projectId="your-project-uuid"
  apiUrl="https://api.normy.dev"   // optional — self-hosted URL
  defaultMode="onPause"            // onBlur | onPause | onSubmit
  pauseMs={2000}                   // debounce for onPause
>
  {children}
</NormyProvider>`}</CodeBlock>

      <h2>Validated fields</h2>
      <CodeBlock>{`<NormyTextarea
  id="cancel-reason"
  question="Why are you cancelling?"
  label="Reason"
  validationMode="onPause"
  rows={4}
/>

<NormyInput
  id="company"
  question="What company do you work for?"
  label="Company"
  validationMode="onBlur"
/>

<NormySelect
  id="experience"
  question="How many years of experience do you have?"
  label="Experience"
  options={[
    { value: '', label: 'Select…' },
    { value: '0-1', label: '0–1 years' },
    { value: '2-5', label: '2–5 years' },
  ]}
/>`}</CodeBlock>

      <h2>Validation modes</h2>
      <table>
        <thead><tr><th>Mode</th><th>When it runs</th></tr></thead>
        <tbody>
          <tr><td><code>onPause</code></td><td>After user stops typing (default 2000ms)</td></tr>
          <tr><td><code>onBlur</code></td><td>When field loses focus</td></tr>
          <tr><td><code>onSubmit</code></td><td>Call <code>triggerValidation()</code> from <code>useValidation</code></td></tr>
        </tbody>
      </table>

      <h2>Custom hook</h2>
      <CodeBlock>{`import { useValidation } from '@normy/react';

function CustomField() {
  const { value, result, isValidating, handleChange, handleBlur, triggerValidation } =
    useValidation({ question: 'Describe the issue', mode: 'onPause' });

  return (
    <>
      <input value={value} onChange={handleChange} onBlur={handleBlur} />
      <NormyToast result={result} isValidating={isValidating} />
    </>
  );
}`}</CodeBlock>

      <h2>Toast behavior</h2>
      <ul>
        <li>Shows loading state while validating</li>
        <li>Displays AI <code>feedback</code> from the API on invalid input</li>
        <li>Auto-dismisses success toasts after 3s (configurable via <code>successDismissMs</code>)</li>
        <li>Dismissible via the × button</li>
        <li>Severity levels: <code>success</code>, <code>info</code>, <code>warning</code>, <code>error</code></li>
      </ul>
    </DocsShell>
  );
}
