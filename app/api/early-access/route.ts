import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // Store in Supabase
  const { error: insertError } = await supabaseAdmin
    .from('early_access')
    .insert({ email })

  if (insertError && insertError.code !== '23505') {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }

  // Send confirmation email (don't block on failure)
  try {
    await resend.emails.send({
      from: 'SignalPath <hello@signalpath.ai>',
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
  } catch (emailError) {
    // Log but don't fail the request — the signup still succeeded
    console.error('Failed to send confirmation email:', emailError)
  }

  return NextResponse.json({ ok: true })
}
