import { NextRequest, NextResponse } from 'next/server'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function POST(req: NextRequest) {
  const authorization = req.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json(
      { message: 'Session expirée. Veuillez vous reconnecter.', grounded: true },
      { status: 401 },
    )
  }

  let body: { messages?: ChatMessage[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { message: 'Requête de conversation invalide.', grounded: true },
      { status: 400 },
    )
  }

  const latestQuestion = [...(body.messages || [])]
    .reverse()
    .find((message) => message.role === 'user' && message.content.trim())
    ?.content.trim()

  if (!latestQuestion) {
    return NextResponse.json(
      { message: 'Aucune question utilisateur à traiter.', grounded: true },
      { status: 422 },
    )
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/ai/assistant/ask`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: latestQuestion, context: null }),
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      const detail = payload && typeof payload === 'object' && 'detail' in payload
        ? (payload as { detail?: unknown }).detail
        : null
      return NextResponse.json(
        {
          message: typeof detail === 'string'
            ? `Assistant indisponible : ${detail}`
            : 'Assistant indisponible : le backend grounded n’a pas pu répondre.',
          grounded: true,
        },
        { status: response.status },
      )
    }

    const answer = payload && typeof payload === 'object' && 'answer' in payload
      ? (payload as { answer?: unknown }).answer
      : null

    if (typeof answer !== 'string' || !answer.trim()) {
      return NextResponse.json(
        { message: 'Aucune réponse sourcée disponible.', grounded: true },
        { status: 502 },
      )
    }

    return NextResponse.json({
      message: answer,
      grounded: true,
      confidence: (payload as { confidence?: unknown }).confidence ?? 0,
      sources: (payload as { sources?: unknown }).sources ?? [],
      source_details: (payload as { source_details?: unknown }).source_details ?? [],
      suggested_actions: (payload as { suggested_actions?: unknown }).suggested_actions ?? [],
      decision_authority: (payload as { decision_authority?: unknown }).decision_authority ?? 'none',
    })
  } catch {
    return NextResponse.json(
      {
        message: 'Assistant indisponible : aucune réponse locale ou aléatoire n’est générée en secours.',
        grounded: true,
      },
      { status: 503 },
    )
  }
}
