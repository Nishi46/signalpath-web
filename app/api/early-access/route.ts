import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const resend = new Resend(process.env.RESEND_API_KEY)
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email } = body
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // Store in Supabase
  const { error: insertError } = await supabaseAdmin
    .from('early_access')
    .insert({ email })

  if (insertError) {
    // 23505 = unique constraint violation — email already exists, treat as success
    if (insertError.code !== '23505') {
      console.error('Supabase insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save email', details: insertError.message },
        { status: 500 },
      )
    }
  }

  // Send confirmation email
  // Use RESEND_FROM_EMAIL env var if set, otherwise fall back to onboarding@resend.dev
  // (onboarding@resend.dev works without domain verification for testing)
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'SignalPath <onboarding@resend.dev>'

  try {
    const { data, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "You're on the early access list!",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; color: #111; margin-bottom: 16px;">
            Welcome to the SignalPath waitlist
          </h1>
          <p style="font-size: 15px; color: #444; line-height: 1.6; margin-bottom: 24px;">
            Thanks for requesting early access! We're reviewing applications and will be in touch within 24 hours to get you set up.
          </p>
          <p style="font-size: 15px; color: #444; line-height: 1.6; margin-bottom: 24px;">
            SignalPath turns your support tickets into prioritized product opportunities — so you can build what matters most.
          </p>
          <p style="font-size: 14px; color: #888;">
            — The SignalPath Team
          </p>
        </div>
      `,
    })

    if (emailError) {
      console.error('Resend email error:', emailError)
    } else {
      console.log('Confirmation email sent:', data?.id)
    }
  } catch (err) {
    console.error('Failed to send confirmation email:', err)
  }

  return NextResponse.json({ ok: true })
}
