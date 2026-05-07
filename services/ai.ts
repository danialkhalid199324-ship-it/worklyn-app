const CLAUDE_API = 'https://api.anthropic.com/v1/messages'

// ── Therapy note generation ────────────────────────────────────────────────────

export async function generateTherapyNoteText({
  formattedNote,
  clientName,
  serviceName,
}: {
  formattedNote: string
  clientName?: string
  serviceName?: string
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_anthropic_api_key') {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add your key to .env.local and restart the dev server.')
  }

  const context = [
    clientName && `Client: ${clientName}`,
    serviceName && `Service: ${serviceName}`,
  ].filter(Boolean).join('\n')

  const prompt = `You are a clinical documentation specialist for a therapy practice. Generate a professional session note narrative using ONLY the information provided. Do not add diagnoses, interpretations, or any detail not explicitly stated. Use professional third-person clinical language.

${context ? `SESSION CONTEXT\n${context}\n\n` : ''}STRUCTURED SESSION DATA
${formattedNote}

---

Write a professional clinical session note (2–4 paragraphs) that synthesises the above information. Integrate the observations, strategies used, and participant response into flowing prose. Conclude with follow-up and plan. Do not use bullet points. Do not repeat section headings. Do not invent details.`

  const response = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    if (response.status === 401) {
      throw new Error('Invalid Anthropic API key. Check ANTHROPIC_API_KEY in .env.local and restart the dev server.')
    }
    throw new Error(`Claude API error ${response.status}: ${body}`)
  }

  const result = await response.json()
  return result.content[0].text as string
}

export interface SessionNoteData {
  clientFirstName: string
  appointmentDate: string
  serviceName: string
  goalsAddressed: string
  observations: string
  interventionsUsed: string
  participantResponse: string
  risksIssues: string
  nextSteps: string
  progressScore: number
}

export async function generateSessionReport(data: SessionNoteData): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_anthropic_api_key') {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add your key to .env.local and restart the dev server.')
  }

  const response = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      messages: [{ role: 'user', content: buildPrompt(data) }],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    if (response.status === 401) {
      throw new Error('Invalid Anthropic API key. Check ANTHROPIC_API_KEY in .env.local and restart the dev server.')
    }
    throw new Error(`Claude API error ${response.status}: ${body}`)
  }

  const result = await response.json()
  return result.content[0].text as string
}

function buildPrompt(data: SessionNoteData): string {
  return `You are a clinical documentation specialist. Generate a professional session report using ONLY the information in the notes below. Do not add diagnoses, interpretations, or any detail not explicitly stated.

SESSION INFORMATION
Client: ${data.clientFirstName}
Date: ${data.appointmentDate}
Service: ${data.serviceName}
Progress Score: ${data.progressScore}/10

GOALS ADDRESSED
${data.goalsAddressed || 'Not specified'}

CLINICAL OBSERVATIONS
${data.observations || 'Not specified'}

INTERVENTIONS USED
${data.interventionsUsed || 'Not specified'}

PARTICIPANT RESPONSE
${data.participantResponse || 'Not specified'}

RISKS / ISSUES
${data.risksIssues || 'None reported'}

NEXT STEPS
${data.nextSteps || 'Not specified'}

---

Write a structured session report using the six sections below. Use full prose paragraphs (no bullet points). Synthesise the notes into professional third-person clinical language. Do not repeat raw note text verbatim. Do not invent details.

**SESSION SUMMARY**

**GOALS & PROGRESS**

**CLINICAL OBSERVATIONS**

**INTERVENTIONS & PARTICIPANT RESPONSE**

**RISK ASSESSMENT**

**PLAN & NEXT STEPS**`
}
