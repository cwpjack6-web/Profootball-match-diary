// ── Vercel Serverless Function: /api/coach ────────────────────────────────────
// Acts as a secure proxy between the frontend and Google Gemini API.
// The API key is stored in Vercel Environment Variables (GEMINI_API_KEY),
// never exposed to the browser.

export default async function handler(req: any, res: any) {

  // ── Only allow POST ────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Check API key is configured ───────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error: API key not set' });
  }

  // ── Extract prompt and system instruction from request body ───────────────
  const { prompt, systemInstruction } = req.body;
  if (!prompt || !systemInstruction) {
    return res.status(400).json({ error: 'Missing prompt or systemInstruction' });
  }

  // ── Call Google Gemini API ────────────────────────────────────────────────
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature:     0.85,
            maxOutputTokens: 1024,
            topP:            0.95,
          },
        }),
      }
    );

    const data = await geminiRes.json();

    // ── Handle Gemini API errors ───────────────────────────────────────────
    if (!geminiRes.ok) {
      console.error('Gemini API error:', data);
      return res.status(geminiRes.status).json({
        error: data?.error?.message || 'Gemini API error',
      });
    }

    // ── Extract text from response ─────────────────────────────────────────
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data));
      return res.status(500).json({ error: 'No content returned from Gemini' });
    }

    return res.status(200).json({ text });

  } catch (error) {
    console.error('Coach API handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
