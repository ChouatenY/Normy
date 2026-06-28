# @normy/react

Real-time AI form validation for React. Normy guides users toward better answers instead of showing generic "invalid input" errors.

## Install

```bash
npm install @normy/react
# or
pnpm add @normy/react
```

## Quick start

```tsx
import { NormyProvider, NormyTextarea } from '@normy/react';

export function CancelForm() {
  return (
    <NormyProvider
      apiKey={process.env.NEXT_PUBLIC_NORMY_API_KEY!}
      projectId={process.env.NEXT_PUBLIC_NORMY_PROJECT_ID!}
      apiUrl="https://api.normy.dev" // optional — for self-hosted
    >
      <NormyTextarea
        id="cancel-reason"
        question="Why are you cancelling?"
        label="Reason for cancellation"
        validationMode="onPause"
        rows={4}
      />
    </NormyProvider>
  );
}
```

## Components

| Component | Purpose |
|-----------|---------|
| `NormyProvider` | API key, project ID, default validation mode |
| `NormyTextarea` | Validated textarea with inline toast |
| `NormyInput` | Validated text input |
| `NormySelect` | Validated select |
| `NormyToast` | Standalone toast (used internally) |

## Validation modes

- `onPause` — validates after user stops typing (default 2000ms)
- `onBlur` — validates when field loses focus
- `onSubmit` — call `triggerValidation()` from `useValidation`

## Docs

Full documentation: [normy.dev/docs](https://normy.dev/docs) (or run `pnpm --filter @normy/docs dev` locally).

## License

MIT
