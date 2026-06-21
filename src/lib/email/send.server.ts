import * as React from 'react'
import { render } from '@react-email/components'
import { TEMPLATES } from '@/lib/email-templates/registry'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

const SITE_NAME = 'tavasatlaides'
const SENDER_DOMAIN = 'notify.tavasatlaides.lv'
const FROM_DOMAIN = 'tavasatlaides.lv'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export interface SendTransactionalOpts {
  templateName: string
  recipientEmail: string
  templateData?: Record<string, any>
  idempotencyKey?: string
}

export async function sendTransactional(opts: SendTransactionalOpts) {
  const template = TEMPLATES[opts.templateName]
  if (!template) throw new Error(`Template '${opts.templateName}' not registered`)

  const recipient = (template.to || opts.recipientEmail).trim()
  if (!recipient) throw new Error('recipientEmail is required')
  const normalized = recipient.toLowerCase()
  const messageId = crypto.randomUUID()
  const idempotencyKey = opts.idempotencyKey || messageId
  const data = opts.templateData ?? {}

  // Suppression check
  const { data: suppressed } = await supabaseAdmin
    .from('suppressed_emails')
    .select('id')
    .eq('email', normalized)
    .maybeSingle()
  if (suppressed) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: opts.templateName,
      recipient_email: recipient,
      status: 'suppressed',
    })
    return { success: false, reason: 'email_suppressed' as const }
  }

  // Get-or-create unsubscribe token
  let unsubscribeToken: string
  const { data: existing } = await supabaseAdmin
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalized)
    .maybeSingle()
  if (existing && !existing.used_at) {
    unsubscribeToken = existing.token
  } else {
    unsubscribeToken = generateToken()
    await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .upsert(
        { token: unsubscribeToken, email: normalized },
        { onConflict: 'email', ignoreDuplicates: true },
      )
    const { data: stored } = await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalized)
      .maybeSingle()
    if (!stored) throw new Error('Failed to persist unsubscribe token')
    unsubscribeToken = stored.token
  }

  // Render
  const element = React.createElement(template.component, data)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function' ? template.subject(data) : template.subject

  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId,
    template_name: opts.templateName,
    recipient_email: recipient,
    status: 'pending',
  })

  const { error } = await supabaseAdmin.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: opts.templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })
  if (error) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: opts.templateName,
      recipient_email: recipient,
      status: 'failed',
      error_message: error.message,
    })
    throw new Error(`Failed to enqueue email: ${error.message}`)
  }

  return { success: true, queued: true, message_id: messageId }
}
