import ZAI from 'z-ai-web-dev-sdk'
import { AI_CONFIG } from '@/lib/ai-config'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: AI_CONFIG.systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const reply = completion.choices[0]?.message?.content || 'Je suis désolé, je ne peux pas répondre pour le moment.'
    return NextResponse.json({ message: reply })
  } catch {
    // Fallback to local responses
    const fallbackIndex = Math.floor(Math.random() * AI_CONFIG.fallbackResponses.length)
    return NextResponse.json({ message: AI_CONFIG.fallbackResponses[fallbackIndex] })
  }
}
