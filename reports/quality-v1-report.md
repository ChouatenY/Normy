# Normy Prompt Quality Evaluation Report (quality-v1)

- **Generated At:** 2026-06-27T02:03:29.334Z
- **Total Test Cases:** 14
- **Passed Test Cases:** 6
- **Accuracy Rate:** 42.9%
- **Average Latency:** 3013.5ms
- **Average Confidence:** 0.48
- **False Positives:** 2
- **False Negatives:** 0
- **Token Usage:** 5105 input tokens, 673 output tokens

## Evaluation Logs

| Dataset Question | User Answer | Expected Issue | Actual Issue | Expected Score | Actual Score | Status | Latency | Tokens (In/Out) |
|---|---|---|---|---|---|---|---|---|
| "Why are you cancelling your subscription?" | "asdfgh" | `RANDOM_TEXT` | `IRRELEVANT_RESPONSE` | `[0, 29]` | 5 | **PASS** | 2713ms | 724/95 |
| "Why are you cancelling your subscription?" | "yes" | `LOW_QUALITY` | `LOW_QUALITY` | `[30, 49]` | 35 | **PASS** | 4063ms | 722/98 |
| "Why are you cancelling your subscription?" | "The service is too expensive for our current budget." | `VALID` | `VALID` | `[80, 100]` | 75 | **FAIL** | 3788ms | 731/83 |
| "What is your primary residential address?" | "abc" | `LOW_QUALITY` | `LOW_QUALITY` | `[30, 49]` | 35 | **PASS** | 3536ms | 722/116 |
| "What is your primary residential address?" | "I live in the forest near the lake." | `LOW_QUALITY` | `LOW_QUALITY` | `[30, 79]` | 35 | **PASS** | 2996ms | 730/121 |
| "What is your primary residential address?" | "123 Main Street, Springfield, OR 97477" | `VALID` | `VALID` | `[80, 100]` | 95 | **PASS** | 1535ms | 736/78 |
| "How can we improve our service?" | "good" | `LOW_QUALITY` | `LOW_CONFIDENCE` | `[30, 49]` | 0 | **FAIL** | 2591ms | 0/0 |
| "How can we improve our service?" | "Your app crashes every time I upload a large PNG file. Please optimize the file upload handler." | `VALID` | `VALID` | `[80, 100]` | 95 | **PASS** | 4000ms | 740/82 |
| "How can we improve our service?" | "I worked as a software developer for 5 years." | `IRRELEVANT_RESPONSE` | `LOW_CONFIDENCE` | `[0, 29]` | 0 | **FAIL** | 2529ms | 0/0 |
| "Describe your role in your previous company." | "I worked." | `LOW_QUALITY` | `LOW_CONFIDENCE` | `[30, 49]` | 0 | **FAIL** | 2831ms | 0/0 |
| "Describe your role in your previous company." | "I led a team of 4 frontend engineers building the customer dashboard using React, TailwindCSS, and Next.js." | `VALID` | `LOW_CONFIDENCE` | `[80, 100]` | 0 | **FAIL** | 3271ms | 0/0 |
| "Describe your role in your previous company." | "I want to buy a new subscription." | `IRRELEVANT_RESPONSE` | `LOW_CONFIDENCE` | `[0, 29]` | 0 | **FAIL** | 2838ms | 0/0 |
| "What is your main goal for using this software?" | "none" | `LOW_QUALITY` | `LOW_CONFIDENCE` | `[30, 49]` | 0 | **FAIL** | 2724ms | 0/0 |
| "What is your main goal for using this software?" | "To automate real-time form validation and get detailed analytics on user input improvements." | `VALID` | `LOW_CONFIDENCE` | `[80, 100]` | 0 | **FAIL** | 2774ms | 0/0 |
