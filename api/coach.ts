
import { GoogleGenAI } from "@google/genai";

// Vercel Node.js Serverless Function
export default async function handler(req: any, res: any) {
    // Enable CORS
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
        const { prompt, systemInstruction } = req.body;

        // Use standard API_KEY environment variable
        const apiKey = process.env.API_KEY;

        if (!apiKey) {
            console.error("Server Error: API_KEY environment variable is missing.");
            return res.status(500).json({ 
                error: 'Server configuration error: API_KEY is missing. Please set it in Vercel settings.' 
            });
        }

        const ai = new GoogleGenAI({ apiKey });

        // Use the standard Flash model for speed and efficiency
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
            }
        });

        const text = response.text;
        return res.status(200).json({ text });

    } catch (error: any) {
        console.error("Gemini API Execution Error:", error);
        // Ensure we always return JSON, even for errors
        return res.status(500).json({ 
            error: error.message || 'An error occurred while communicating with the AI coach.' 
        });
    }
}
