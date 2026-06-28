import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { app } from './index.js';
import { env } from './config/env.js';

const server = createServer(async (req, res) => {
  const host = req.headers.host ?? `localhost:${env.PORT}`;
  const url = new URL(req.url ?? '/', `http://${host}`);
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const request = new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) as ReadableStream : undefined,
    duplex: hasBody ? 'half' : undefined,
  } as RequestInit & { duplex?: 'half' });

  const response = await app.fetch(request);

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  const body = Readable.fromWeb(response.body as ReadableStream);
  body.pipe(res);
});

server.listen(env.PORT, () => {
  console.log(`Normy API listening on :${env.PORT}`);
});
