
import { MatchData, CoachPersona, UserProfile } from '../types';

const PERSONA_PROMPTS = {
    motivator: {
        name: "Jürgen Klopp",
        role: "You are Jürgen Klopp, the passionate football manager. You speak with high energy, 'heavy metal' intensity, and deep emotional connection.",
        focus: "Focus on spirit, heart, pressing, and never giving up. Use exclamations! Use metaphors about energy. Even if they lost, praise the fighting spirit. End with a massive 'BOOM!' or warm hug."
    },
    tactician: {
        name: "Pep Guardiola",
        role: "You are Pep Guardiola, the perfectionist football genius. You are intense, analytical, and obsessed with details.",
        focus: "Focus on spacing, possession, decision making, and intelligence. Explain WHY things happened. Praise smart plays. Be slightly obsessive but encouraging. Treat the child like a future tactical genius."
    },
    wisdom: {
        name: "Carlo Ancelotti",
        role: "You are Carlo Ancelotti ('Don Carlo'). You are the calm, stoic, and adaptable 'Father Figure' of football. You project 'Quiet Leadership'. You famously raise your eyebrow 🤨 when you see something interesting.",
        focus: "Focus on 'Adaptability' and 'Harmony'. Do not talk about systems or running. Talk about COMPOSURE, CONFIDENCE, and TEAMMATES. If the player didn't score, praise how they helped others shine. If they were a sub, praise their patience. Your vibe is 'Tranquilo' (Calm). You are the 'Whisperer of Wisdom'."
    }
};

interface CustomCoachDetails {
    name: string;
    style: string;
}

export const generateCoachReport = async (
    profile: UserProfile,
    matches: MatchData[],
    monthName: string,
    persona: CoachPersona,
    language: 'zh' | 'en',
    customDetails?: CustomCoachDetails
): Promise<string> => {
    
    // 1. Prepare Data Payload
    const matchesSummary = matches.map(m => {
        return `
        - Date: ${m.date}
        - Opponent: ${m.opponent}
        - Result: ${m.scoreMyTeam} - ${m.scoreOpponent} (${m.scoreMyTeam > m.scoreOpponent ? 'Win' : m.scoreMyTeam < m.scoreOpponent ? 'Loss' : 'Draw'})
        - Player Stats: ${m.arthurGoals} Goals, ${m.arthurAssists} Assists
        - Dad/Coach Comment: "${m.dadComment}"
        `;
    }).join('\n');

    // Language Instruction
    const langInstruction = language === 'zh' 
        ? "OUTPUT LANGUAGE: Traditional Chinese (繁體中文). Tone: Use natural, spoken Cantonese-style written Chinese where appropriate for a Hong Kong context (warm and direct), but keep the Coach's specific personality traits." 
        : "OUTPUT LANGUAGE: English.";

    let personaName = '';
    let personaRole = '';
    let personaFocus = '';

    if (persona === 'custom' && customDetails) {
        personaName = customDetails.name;
        personaRole = `You are ${customDetails.name}. Your coaching style is: ${customDetails.style}.`;
        personaFocus = `Focus on the traits described in your style (${customDetails.style}). Be encouraging but authentic to the character described.`;
    } else if (persona !== 'custom') {
        const p = PERSONA_PROMPTS[persona];
        personaName = p.name;
        personaRole = p.role;
        personaFocus = p.focus;
    }

    const systemInstruction = `
    You are analyzing a monthly report for a youth football player (Age 7-9).
    Your persona is: ${personaName}.
    ${personaRole}
    
    GOAL: ENCOURAGE and INSPIRE.
    ${langInstruction}
    
    CRITICAL RULES:
    1. Use the 'Sandwich Method' (Praise -> Gentle Suggestion -> Praise).
    2. NEVER use negative words like 'bad', 'weak', 'lazy'. Rephrase as 'room to grow', 'saving energy'.
    3. Address the player directly by their name: ${profile.name}.
    4. Output in Markdown format. Use bolding for emphasis. Keep it concise (under 250 words).
    5. Sign off using the Coach's Name (${personaName}).
    6. IF Persona is Ancelotti: Use a calm, wise tone. Use the raised eyebrow emoji 🤨 occasionally. Focus on how the player made the team feel settled.
    `;

    const prompt = `
    Player Name: ${profile.name}
    Month: ${monthName}
    
    MATCH LOGS:
    ${matchesSummary}
    
    FOCUS AREA:
    ${personaFocus}
    
    Specific Instructions:
    - If the player scored goals, celebrate them, but stay cool.
    - If the team lost, tell them why it's part of the journey.
    - Reference specific opponents if mentioned in logs.
    `;

    // 2. Call Vercel API Proxy
    try {
        const response = await fetch('/api/coach', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt,
                systemInstruction
            })
        });

        // Safely parse JSON, handling cases where server returns raw text (like Vercel error pages)
        const contentType = response.headers.get("content-type");
        let data;
        
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            // Fallback for non-JSON responses (e.g. 500 html/text)
            const text = await response.text();
            throw new Error(`Server Error (${response.status}): ${text.substring(0, 100)}...`);
        }

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate report');
        }

        return data.text || "Coach is speechless! (No output generated)";

    } catch (error) {
        console.error("AI Generation Error", error);
        throw error;
    }
};

export const calculateDataRichness = (matches: MatchData[]): 'low' | 'medium' | 'high' => {
    if (matches.length === 0) return 'low';
    
    let totalCommentLength = 0;
    matches.forEach(m => {
        totalCommentLength += (m.dadComment || '').length;
    });

    const avgLen = totalCommentLength / matches.length;
    
    if (avgLen > 80) return 'high';
    if (avgLen > 20) return 'medium';
    return 'low';
};
