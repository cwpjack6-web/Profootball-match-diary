
import { GoogleGenAI } from "@google/genai";

// Vercel Node.js Serverless Function
export default async function handler(req: any, res: any) {
    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // 2. Handle Preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 3. Method Check
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 4. Robust Body Parsing
        // Vercel sometimes passes body as string depending on content-type headers
        let body = req.body;
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                console.error("Failed to parse request body string:", e);
                return res.status(400).json({ error: 'Invalid JSON body' });
            }
        }
        
        const { prompt, systemInstruction } = body || {};

        if (!prompt) {
            return res.status(400).json({ error: 'Missing "prompt" in request body' });
        }

        // 5. Environment Variable Check
        // Using standard API_KEY as per Google GenAI SDK guidelines
        const apiKey = process.env.API_KEY;

        if (!apiKey) {
            console.error("CRITICAL: API_KEY is missing in server environment variables.");
            // Return 500 but JSON formatted so frontend doesn't crash on syntax error
            return res.status(500).json({ 
                error: 'Server Configuration Error: API_KEY is missing. Please configure it in Vercel Settings.' 
            });
        }

        // 6. Initialize SDK
        const ai = new GoogleGenAI({ apiKey });

        // 7. Call Gemini 3.0 Flash
        // Using 'gemini-3-flash-preview' as requested
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
            }
        });

        const text = response.text;
        
        // 8. Success Response
        return res.status(200).json({ text });

    } catch (error: any) {
        console.error("Gemini API Execution Exception:", error);
        
        // Handle specific Google API errors gracefully
        let errorMessage = error.message || 'An unknown AI error occurred.';
        if (error.message?.includes('403')) {
            errorMessage = 'API Key invalid or has no access to this model.';
        } else if (error.message?.includes('429')) {
            errorMessage = 'Too many requests. Please try again later.';
        }

        return res.status(500).json({ 
            error: errorMessage 
        });
    }
}
