
import { GoogleGenAI } from "@google/genai";

// Vercel Node.js Serverless Function
export default async function handler(req: any, res: any) {
    // Enable CORS just in case, though Vercel handles same-origin automatically
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Parse body - Vercel parses JSON body automatically
        const { prompt, systemInstruction } = req.body;

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("API Key missing on server");
            return res.status(500).json({ error: 'Server configuration error: API Key missing' });
        }

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-lite-preview-02-05',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
            }
        });

        const text = response.text;

        return res.status(200).json({ text });

    } catch (error: any) {
        console.error("Gemini API Error:", error);
        return res.status(500).json({ error: error.message || 'Error processing request' });
    }
}
