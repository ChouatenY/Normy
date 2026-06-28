# @normy/js

Framework-agnostic JavaScript SDK for Normy AI form validation.

## Install

```bash
npm install @normy/js
# or
pnpm add @normy/js
```

## Quick start

```ts
import { createNormy } from '@normy/js';

const normy = createNormy({
  apiKey: 'nrm_live_...',
  baseUrl: 'https://api.normy.dev', // optional
});

const result = await normy.validate({
  projectId: 'your-project-id',
  question: 'Why are you cancelling?',
  answer: 'pizza',
});

if (result.ok) {
  console.log(result.data.valid);    // false
  console.log(result.data.feedback); // AI guidance message
}
```

## License

MIT
