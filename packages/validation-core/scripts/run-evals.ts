import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GeminiProvider } from '../src/providers/gemini.provider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestCase {
  question: string;
  answer: string;
  expectedIssue: string;
  expectedScoreRange: [number, number];
}

interface ResultLog {
  question: string;
  answer: string;
  expectedIssue: string;
  actualIssue: string;
  expectedScoreRange: string;
  actualScore: number;
  confidence: number;
  latencyMs: number;
  status: 'PASS' | 'FAIL';
  inputTokens: number;
  outputTokens: number;
}

const datasets = [
  'subscription-cancellation.json',
  'government-forms.json',
  'customer-feedback.json',
  'job-application.json',
  'survey.json',
];

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY environment variable is required to run evaluations.');
    process.exit(1);
  }

  const provider = new GeminiProvider({
    provider: 'gemini',
    apiKey,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
  });

  const testCases: { file: string; cases: TestCase[] }[] = [];
  const datasetsDir = path.resolve(__dirname, '../test-datasets');

  for (const filename of datasets) {
    const filepath = path.join(datasetsDir, filename);
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf8');
      testCases.push({
        file: filename,
        cases: JSON.parse(content) as TestCase[],
      });
    }
  }

  const logs: ResultLog[] = [];
  let passedCount = 0;
  let totalCount = 0;
  let totalLatency = 0;
  let totalConfidence = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  let falsePositives = 0; // expected VALID but got non-VALID
  let falseNegatives = 0; // expected non-VALID but got VALID

  console.log(`Starting prompt quality evaluations against ${datasets.length} datasets...`);

  for (const group of testCases) {
    console.log(`\nEvaluating dataset: ${group.file}`);
    for (const testCase of group.cases) {
      totalCount++;
      const startTime = Date.now();
      
      const promptVersion = group.file.replace('.json', '');
      
      const result = await provider.validate({
        question: testCase.question,
        answer: testCase.answer,
        promptVersion: 'quality-v1', // use main base template or matching template name
      });

      const latency = Date.now() - startTime;
      totalLatency += latency;
      totalConfidence += result.confidence;

      const inputTokens = result.tokenUsage?.inputTokens ?? 0;
      const outputTokens = result.tokenUsage?.outputTokens ?? 0;
      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;

      const scorePass = result.score >= testCase.expectedScoreRange[0] && result.score <= testCase.expectedScoreRange[1];
      
      // Let's check issue matching
      // Since local validators handle empty/too_short/random_text/spam, we bypass AI for those, 
      // but here we run them directly in GeminiProvider to test the provider's understanding.
      // Therefore, if the expected issue is RANDOM_TEXT but Gemini Provider returns LOW_QUALITY, it's acceptable.
      let issuePass = false;
      if (testCase.expectedIssue === result.issue) {
        issuePass = true;
      } else if (
        ['RANDOM_TEXT', 'TOO_SHORT', 'EMPTY', 'SPAM'].includes(testCase.expectedIssue) &&
        ['LOW_QUALITY', 'IRRELEVANT_RESPONSE'].includes(result.issue)
      ) {
        // AI correctly caught it as low quality/irrelevant
        issuePass = true;
      }

      const pass = scorePass && issuePass;
      if (pass) {
        passedCount++;
      }

      if (testCase.expectedIssue === 'VALID' && result.issue !== 'VALID') {
        falsePositives++;
      } else if (testCase.expectedIssue !== 'VALID' && result.issue === 'VALID') {
        falseNegatives++;
      }

      logs.push({
        question: testCase.question,
        answer: testCase.answer,
        expectedIssue: testCase.expectedIssue,
        actualIssue: result.issue,
        expectedScoreRange: `[${testCase.expectedScoreRange.join(', ')}]`,
        actualScore: result.score,
        confidence: result.confidence,
        latencyMs: latency,
        status: pass ? 'PASS' : 'FAIL',
        inputTokens,
        outputTokens,
      });

      console.log(`- Q: "${testCase.question.substring(0, 30)}..." | A: "${testCase.answer}" -> Got: ${result.issue} (${result.score}) [${pass ? 'PASS' : 'FAIL'}]`);
    }
  }

  const avgLatency = totalLatency / totalCount;
  const avgConfidence = totalConfidence / totalCount;
  const accuracy = (passedCount / totalCount) * 100;

  // Write markdown report
  const reportsDir = path.resolve(__dirname, '../../../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = path.join(reportsDir, 'quality-v1-report.md');
  const timestamp = new Date().toISOString();

  let markdown = `# Normy Prompt Quality Evaluation Report (quality-v1)

- **Generated At:** ${timestamp}
- **Total Test Cases:** ${totalCount}
- **Passed Test Cases:** ${passedCount}
- **Accuracy Rate:** ${accuracy.toFixed(1)}%
- **Average Latency:** ${avgLatency.toFixed(1)}ms
- **Average Confidence:** ${avgConfidence.toFixed(2)}
- **False Positives:** ${falsePositives}
- **False Negatives:** ${falseNegatives}
- **Token Usage:** ${totalInputTokens} input tokens, ${totalOutputTokens} output tokens

## Evaluation Logs

| Dataset Question | User Answer | Expected Issue | Actual Issue | Expected Score | Actual Score | Status | Latency | Tokens (In/Out) |
|---|---|---|---|---|---|---|---|---|
`;

  for (const log of logs) {
    markdown += `| "${log.question}" | "${log.answer}" | \`${log.expectedIssue}\` | \`${log.actualIssue}\` | \`${log.expectedScoreRange}\` | ${log.actualScore} | **${log.status}** | ${log.latencyMs}ms | ${log.inputTokens}/${log.outputTokens} |\n`;
  }

  fs.writeFileSync(reportPath, markdown, 'utf8');
  console.log(`\nEvaluation report successfully generated: ${reportPath}`);
}

main().catch((err) => {
  console.error('Unhandled error in evaluation runner:', err);
  process.exit(1);
});
