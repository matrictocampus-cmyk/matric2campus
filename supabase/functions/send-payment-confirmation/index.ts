// supabase/functions/send-payment-confirmation/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend?target=deno'

// Environment variables
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const PROJECT_URL = Deno.env.get('PROJECT_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!

// Initialize clients
const resend = new Resend(RESEND_API_KEY)
const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    // Parse request body
    const { email, name, amount, package: pkg, reference } = await req.json()

    // Validate required fields
    if (!email || !name || !amount || !pkg) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send email via Resend
    const { data, error: emailError } = await resend.emails.send({
      from: 'TXI <nectelm.co.za>', // Use your verified domain
      to: [email],
      subject: '✅ Payment Confirmed – Your Application Package is Active',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .amount { font-size: 24px; font-weight: bold; color: #059669; }
            .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 TXI Application System</h1>
            </div>
            <div class="content">
              <h2>Dear ${name},</h2>
              <p>Great news! Your payment has been confirmed.</p>
              <p><strong>Package:</strong> ${pkg}</p>
              <p><strong>Amount:</strong> <span class="amount">R${amount}</span></p>
              ${reference ? `<p><strong>Reference:</strong> ${reference}</p>` : ''}
              <p>Your application package is now active. You can proceed with your applications.</p>
              <p>Thank you for choosing TXI!</p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Optionally log the email in your database
    await supabase.from('email_logs').insert({
      recipient: email,
      subject: 'Payment Confirmed',
      sent_at: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})