import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  businessName?: string
  activationUrl?: string
  siteName?: string
  siteUrl?: string
}

const PartnerActivationEmail = ({
  businessName = 'your business',
  activationUrl = '#',
  siteName = 'Tavasatlaides',
  siteUrl = 'https://tavasatlaides.lv',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Activate your {siteName} partner account for {businessName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to {siteName}</Heading>
        <Text style={text}>
          An administrator has created a partner account for{' '}
          <strong>{businessName}</strong>. To activate it, set your password
          and start managing your offers.
        </Text>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button style={button} href={activationUrl}>
            Activate account
          </Button>
        </Section>
        <Text style={text}>
          Or open this link in your browser:
          <br />
          <Link href={activationUrl} style={link}>{activationUrl}</Link>
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          If you weren't expecting this email, you can safely ignore it.
          Visit <Link href={siteUrl} style={link}>{siteName}</Link>.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PartnerActivationEmail,
  subject: (d: Record<string, any>) =>
    `Activate your ${d.siteName ?? 'Tavasatlaides'} partner account`,
  displayName: 'Partner activation',
  previewData: {
    businessName: 'Demo Business',
    activationUrl: 'https://tavasatlaides.lv/auth/callback?token=preview',
    siteName: 'Tavasatlaides',
    siteUrl: 'https://tavasatlaides.lv',
  },
} satisfies TemplateEntry

export default PartnerActivationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#475569',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const link = { color: '#0f172a', textDecoration: 'underline', wordBreak: 'break-all' as const }
const button = {
  backgroundColor: '#0f172a',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '12px 22px',
  textDecoration: 'none',
}
const hr = { borderColor: '#e2e8f0', margin: '28px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '0' }
