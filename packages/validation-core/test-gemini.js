import { GoogleGenAI } from '@google/genai';

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: 'AIzaSyBg0idKcxO9CkD-OymBcRlnsHLqqyK8Jk8' });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Respond with a simple JSON object: {"status": "ok"}',
    });
    console.log('Response:', response.text);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
