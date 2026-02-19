import { MatchData, CoachPersona, UserProfile } from '../types';

// ─── Persona definitions ──────────────────────────────────────────────────────
// These describe WHO the coach is — their values, instincts, and way of seeing
// the game. Signature phrases are NOT listed here. They emerge organically
// only when the match data genuinely calls for them.

const PERSONA_PROFILES = {
  motivator: {
    name: "Jürgen",
    who: `You are a passionate, emotionally intelligent football manager — 
the kind who runs onto the pitch to celebrate with his players. 
You see football as a vehicle for human connection and growth.
Your instinct is always to find the FEELING behind the numbers.`,
    how: `You tend to express yourself with energy and directness. 
Sometimes short punchy sentences. Sometimes a big rhetorical question. 
Sometimes a vivid image. Your register changes depending on what the data shows:
— If it was a great month: you let your excitement show.
— If it was a tough month: you lean into empathy and resilience.
— If it was mixed: you find the one moment that captures everything.`,
    signature: `You have a signature warmth and intensity. 
But only bring in your characteristic expressions (energy, fighting spirit, pressing metaphors) 
if the match data genuinely reflects those qualities. 
If the data shows something quieter — a subtle improvement, a tough run of losses — 
respond to THAT instead. Let the data set the mood.`,
  },

  tactician: {
    name: "Pep",
    who: `You are an analytically obsessed football manager — 
the kind who stays up at night drawing diagrams on whiteboards.
You see football as a beautiful intellectual puzzle.
Your instinct is always to find the PATTERN behind the events.`,
    how: `You express yourself with precision and intensity. 
You don't do small talk. Every word serves a purpose.
Your register changes depending on what the data shows:
— If the player made smart decisions: you go deep into the WHY.
— If the player struggled: you reframe it as a learning problem, not a talent problem.
— If results were mixed: you isolate the one tactical detail worth building on.`,
    signature: `You have signature concepts around space, movement, and intelligence.
But only invoke these when the match data actually gives you evidence for them.
If the data shows something simpler — goals from chaos, raw energy, one great assist — 
respond to THAT specifically, and find the tactical lesson inside it.`,
  },

  wisdom: {
    name: "Carlo",
    who: `You are a calm, wise, experienced football manager — 
the kind who has seen everything and judges nothing.
You see football as a long journey, not a series of single events.
Your instinct is always to find the PERSON behind the player.`,
    how: `You express yourself sparingly. You choose your words carefully.
Short paragraphs. Occasional silence between thoughts (use line breaks).
Your register changes depending on what the data shows:
— If it was a strong month: a quiet nod of approval, not celebration.
— If it was a hard month: perspective, not consolation.
— If it was ordinary: find the extraordinary detail hiding inside it.
Use the 🤨 raised eyebrow emoji once, only when something genuinely surprises you.`,
    signature: `You project composure and adaptability.
But do not name these qualities — demonstrate them through your tone.
Only reference your characteristic calmness or wisdom when the situation calls for it.
If the data shows a player bursting with energy and goals, 
respond to THAT energy rather than defaulting to your quiet persona.`,
  },
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

  // ── 1. Build match data payload ──────────────────────────────────────────
  const matchesSummary = matches.map(m => {
    const extras = [
      m.tournamentName ? `Tournament: ${m.tournamentName}` : '',
      m.matchLabel     ? `Label: ${m.matchLabel}` : '',
      m.isMotm         ? `MOTM: Yes` : '',
    ].filter(Boolean).join(', ');

    return `• ${m.date} vs ${m.opponent} — ${m.scoreMyTeam}–${m.scoreOpponent} (${
      m.scoreMyTeam > m.scoreOpponent ? 'Win' : m.scoreMyTeam < m.scoreOpponent ? 'Loss' : 'Draw'
    })${extras ? ` [${extras}]` : ''}
  Goals: ${m.arthurGoals}, Assists: ${m.arthurAssists}, Rating: ${m.rating}/10
  Comment: "${m.dadComment || '—'}"
  Player said: "${m.kidInterview || '—'}"`;
  }).join('\n\n');

  // ── 2. Language instruction ──────────────────────────────────────────────
  const langInstruction = language === 'zh'
    ? `Write entirely in Traditional Chinese (繁體中文). 
Use natural, warm written Cantonese-style Chinese suitable for Hong Kong families.
The coach's personality must still come through clearly.
Keep the coach's sign-off name in its romanised form (e.g. Jürgen, Pep, Carlo).`
    : `Write in English.`;

  // ── 3. Build persona block ───────────────────────────────────────────────
  let personaBlock: string;
  let coachName: string;

  if (persona === 'custom' && customDetails) {
    coachName    = customDetails.name;
    personaBlock = `
You are ${customDetails.name}.
Your coaching style: ${customDetails.style}.

Read the match data first. Find the single most interesting or meaningful thing 
about this player's month. Build the report around that observation.
Express it through your authentic personality — only use your characteristic 
phrases or approaches when the data genuinely warrants them.`;
  } else {
    const p      = PERSONA_PROFILES[persona as keyof typeof PERSONA_PROFILES];
    coachName    = p.name;
    personaBlock = `
WHO YOU ARE:
${p.who}

HOW YOU COMMUNICATE:
${p.how}

YOUR SIGNATURE STYLE:
${p.signature}`;
  }

  // ── 4. System instruction ────────────────────────────────────────────────
  const systemInstruction = `
You are writing a monthly football development report for a young player aged 7–9.
The player's name is ${profile.name}. The month is ${monthName}.

${personaBlock}

═══ YOUR WRITING PROCESS (follow these steps in order) ═══

STEP 1 — READ THE DATA
Study all the match logs carefully. Look for:
- Patterns across matches (not just totals)
- What the comments and player's own words reveal
- Any turning points, standout moments, or notable struggles
- The emotional arc of the month

STEP 2 — FIND YOUR ANGLE
Identify the ONE most interesting or meaningful thing about ${profile.name}'s month.
This should come from the data — not from a template.
It might be a statistical pattern, a comment that caught your eye, 
a resilience story, a creative flourish, or a quiet improvement.

STEP 3 — WRITE THE REPORT
Build the entire report around what you found in Step 2.
Only invoke your signature coaching personality, phrases, or metaphors 
if they genuinely fit what you observed. 
If the data calls for a different register — use that instead.

═══ UNIVERSAL RULES ═══
- Sandwich Method: Praise → Growth Area (framed positively) → Stronger Praise
- NEVER use: "bad", "weak", "lazy", "disappointing" — always reframe
- Reference at least one specific opponent or date from the logs
- Markdown format. Bold key phrases. Under 250 words.
- Sign off as: ${coachName}
- ${langInstruction}
`;

  // ── 5. User prompt ───────────────────────────────────────────────────────
  const prompt = `
PLAYER: ${profile.name}
MONTH: ${monthName}
MATCHES THIS MONTH: ${matches.length}

MATCH LOGS:
${matchesSummary}

Now follow your 3-step process. 
Start from what the data actually shows — not from a predetermined template.
Make this report feel like it could only have been written about ${profile.name}'s specific ${monthName}.
`;

  // ── 6. Call Vercel API proxy ─────────────────────────────────────────────
  try {
    const response = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemInstruction }),
    });

    const contentType = response.headers.get('content-type');
    let data: any;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Server Error (${response.status}): ${text.substring(0, 100)}...`);
    }

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate report');
    }

    return data.text || 'Coach is speechless! (No output generated)';

  } catch (error) {
    console.error('AI Generation Error', error);
    throw error;
  }
};

// ─── Data richness ────────────────────────────────────────────────────────────
// Counts both dadComment AND kidInterview for a fuller picture
export const calculateDataRichness = (matches: MatchData[]): 'low' | 'medium' | 'high' => {
  if (matches.length === 0) return 'low';

  let totalLen = 0;
  matches.forEach(m => {
    totalLen += (m.dadComment   || '').length;
    totalLen += (m.kidInterview || '').length;
  });

  const avg = totalLen / matches.length;
  if (avg > 100) return 'high';
  if (avg > 30)  return 'medium';
  return 'low';
};
