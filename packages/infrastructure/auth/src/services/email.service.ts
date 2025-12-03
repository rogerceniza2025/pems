/**
 * Email Service for Authentication
 *
 * Handles sending emails for verification, password reset,
 * and other authentication-related communications
 */

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export class EmailService {
  private readonly smtpHost: string
  private readonly smtpPort: number
  private readonly smtpUser: string
  private readonly smtpPass: string
  private readonly fromEmail: string
  private readonly fromName: string
  private readonly isConfigured: boolean

  constructor() {
    this.smtpHost = process.env.SMTP_HOST || ''
    this.smtpPort = Number(process.env.SMTP_PORT) || 587
    this.smtpUser = process.env.SMTP_USER || ''
    this.smtpPass = process.env.SMTP_PASS || ''
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@pems.com'
    this.fromName = process.env.FROM_NAME || 'PEMS'
    this.isConfigured = !!(this.smtpHost && this.smtpUser && this.smtpPass)
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      console.log(`[EMAIL MOCK] To: ${options.to}, Subject: ${options.subject}`)
      console.log(`[EMAIL MOCK] HTML: ${options.html}`)
      return { success: true }
    }

    try {
      // TODO: Implement actual email sending using nodemailer or similar
      // For now, this is a mock implementation
      console.log(`[EMAIL] Sending to: ${options.to}`)
      console.log(`[EMAIL] Subject: ${options.subject}`)

      // Mock implementation - replace with real email service
      // Example with nodemailer:
      /*
      const transporter = nodemailer.createTransport({
        host: this.smtpHost,
        port: this.smtpPort,
        secure: this.smtpPort === 465,
        auth: {
          user: this.smtpUser,
          pass: this.smtpPass,
        },
      })

      const result = await transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      })

      console.log('Email sent:', result.messageId)
      */

      return { success: true }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error'
      }
    }
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(email: string, verificationUrl: string, userName?: string): Promise<{ success: boolean; error?: string }> {
    const template = this.getVerificationEmailTemplate(verificationUrl, userName)

    return this.sendEmail({
      to: email,
      ...template
    })
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetUrl: string, userName?: string): Promise<{ success: boolean; error?: string }> {
    const template = this.getPasswordResetEmailTemplate(resetUrl, userName)

    return this.sendEmail({
      to: email,
      ...template
    })
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, userName?: string, tenantName?: string): Promise<{ success: boolean; error?: string }> {
    const template = this.getWelcomeEmailTemplate(userName, tenantName)

    return this.sendEmail({
      to: email,
      ...template
    })
  }

  /**
   * Send MFA setup email
   */
  async sendMFASetupEmail(email: string, mfaEnabled: boolean, userName?: string): Promise<{ success: boolean; error?: string }> {
    const template = this.getMFASetupEmailTemplate(mfaEnabled, userName)

    return this.sendEmail({
      to: email,
      ...template
    })
  }

  /**
   * Send suspicious activity email
   */
  async sendSuspiciousActivityEmail(email: string, activity: string, ip?: string, userAgent?: string): Promise<{ success: boolean; error?: string }> {
    const template = this.getSuspiciousActivityEmailTemplate(activity, ip, userAgent)

    return this.sendEmail({
      to: email,
      ...template
    })
  }

  /**
   * Get email verification template
   */
  private getVerificationEmailTemplate(verificationUrl: string, userName?: string): EmailTemplate {
    const greeting = userName ? `Hello ${userName},` : 'Hello,'

    return {
      subject: 'Verify your email address',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Verify Your Email</h1>
            </div>
            <div class="content">
              <p>${greeting}</p>
              <p>Thank you for signing up for PEMS! Please verify your email address to complete your registration.</p>
              <p>This verification link will expire in 24 hours.</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </p>
              <p>If you didn't create an account with PEMS, you can safely ignore this email.</p>
              <p>If the button above doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
            </div>
            <div class="footer">
              <p>© 2024 PEMS. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Verify Your Email Address

        ${greeting}

        Thank you for signing up for PEMS! Please verify your email address to complete your registration.

        This verification link will expire in 24 hours.

        Click here to verify: ${verificationUrl}

        If you didn't create an account with PEMS, you can safely ignore this email.

        © 2024 PEMS. All rights reserved.
      `
    }
  }

  /**
   * Get password reset template
   */
  private getPasswordResetEmailTemplate(resetUrl: string, userName?: string): EmailTemplate {
    const greeting = userName ? `Hello ${userName},` : 'Hello,'

    return {
      subject: 'Reset your password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
            .warning { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 10px; border-radius: 4px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔑 Reset Your Password</h1>
            </div>
            <div class="content">
              <p>${greeting}</p>
              <p>We received a request to reset your password for your PEMS account.</p>
              <div class="warning">
                <strong>Security Notice:</strong> This link will expire in 1 hour for your security.
              </div>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
              <p>If the button above doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 4px;">${resetUrl}</p>
            </div>
            <div class="footer">
              <p>© 2024 PEMS. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Reset Your Password

        ${greeting}

        We received a request to reset your password for your PEMS account.

        Security Notice: This link will expire in 1 hour for your security.

        Click here to reset: ${resetUrl}

        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

        © 2024 PEMS. All rights reserved.
      `
    }
  }

  /**
   * Get welcome email template
   */
  private getWelcomeEmailTemplate(userName?: string, tenantName?: string): EmailTemplate {
    const greeting = userName ? `Hello ${userName},` : 'Hello,'
    const tenantText = tenantName ? ` for ${tenantName}` : ''

    return {
      subject: 'Welcome to PEMS!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to PEMS</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
            .feature { background: #fff; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #10b981; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to PEMS!</h1>
            </div>
            <div class="content">
              <p>${greeting}</p>
              <p>Welcome to PEMS${tenantText}! We're excited to have you on board.</p>

              <div class="feature">
                <strong>🔐 Security First:</strong> Your account is protected with advanced security features.
              </div>

              <div class="feature">
                <strong>🏢 Multi-Tenant:</strong> Seamlessly manage your organization's data.
              </div>

              <div class="feature">
                <strong>📱 Responsive:</strong> Access your account from any device, anywhere.
              </div>

              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'https://pems.com'}" class="button">Get Started</a>
              </p>

              <p>If you have any questions, please don't hesitate to contact our support team.</p>
            </div>
            <div class="footer">
              <p>© 2024 PEMS. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to PEMS!

        ${greeting}

        Welcome to PEMS${tenantText}! We're excited to have you on board.

        🔐 Security First: Your account is protected with advanced security features.
        🏢 Multi-Tenant: Seamlessly manage your organization's data.
        📱 Responsive: Access your account from any device, anywhere.

        Get started here: ${process.env.FRONTEND_URL || 'https://pems.com'}

        If you have any questions, please don't hesitate to contact our support team.

        © 2024 PEMS. All rights reserved.
      `
    }
  }

  /**
   * Get MFA setup email template
   */
  private getMFASetupEmailTemplate(mfaEnabled: boolean, userName?: string): EmailTemplate {
    const greeting = userName ? `Hello ${userName},` : 'Hello,'
    const action = mfaEnabled ? 'enabled' : 'disabled'
    const color = mfaEnabled ? '#10b981' : '#f59e0b'
    const emoji = mfaEnabled ? '✅' : '⚠️'

    return {
      subject: `Multi-factor authentication ${action}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>MFA ${action}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
            .notice { background: ${mfaEnabled ? '#ecfdf5' : '#fef3c7'}; border: 1px solid ${mfaEnabled ? '#a7f3d0' : '#fde68a'}; color: ${mfaEnabled ? '#065f46' : '#92400e'}; padding: 15px; border-radius: 6px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${emoji} Multi-factor Authentication ${action}</h1>
            </div>
            <div class="content">
              <p>${greeting}</p>
              <div class="notice">
                ${mfaEnabled
                  ? 'Multi-factor authentication has been successfully enabled on your account. Your account is now more secure.'
                  : 'Multi-factor authentication has been disabled on your account. Your account is now less secure.'
                }
              </div>
              ${mfaEnabled
                ? '<p>You can use your authenticator app or backup codes to sign in to your account.</p>'
                : '<p>You can enable MFA again anytime from your account settings.</p>'
              }
              <p>If you didn't make this change, please contact support immediately.</p>
            </div>
            <div class="footer">
              <p>© 2024 PEMS. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Multi-factor Authentication ${action}

        ${greeting}

        ${mfaEnabled
          ? 'Multi-factor authentication has been successfully enabled on your account. Your account is now more secure.'
          : 'Multi-factor authentication has been disabled on your account. Your account is now less secure.'
        }

        ${mfaEnabled
          ? 'You can use your authenticator app or backup codes to sign in to your account.'
          : 'You can enable MFA again anytime from your account settings.'
        }

        If you didn't make this change, please contact support immediately.

        © 2024 PEMS. All rights reserved.
      `
    }
  }

  /**
   * Get suspicious activity email template
   */
  private getSuspiciousActivityEmailTemplate(activity: string, ip?: string, userAgent?: string): EmailTemplate {
    return {
      subject: 'Suspicious activity detected on your account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Suspicious Activity</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
            .warning { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .details { background: #fff; padding: 15px; margin: 15px 0; border-radius: 6px; border-left: 4px solid #dc2626; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 Suspicious Activity Detected</h1>
            </div>
            <div class="content">
              <p>We detected suspicious activity on your PEMS account:</p>

              <div class="details">
                <strong>Activity:</strong> ${activity}<br>
                ${ip ? `<strong>IP Address:</strong> ${ip}<br>` : ''}
                ${userAgent ? `<strong>Device:</strong> ${userAgent}<br>` : ''}
                <strong>Time:</strong> ${new Date().toLocaleString()}
              </div>

              <div class="warning">
                <strong>Recommended Actions:</strong>
                <ul>
                  <li>Review your account activity</li>
                  <li>Change your password immediately</li>
                  <li>Enable multi-factor authentication if not already enabled</li>
                  <li>Contact support if you don't recognize this activity</li>
                </ul>
              </div>

              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/auth/reset-password" class="button">Change Password</a>
              </p>

              <p>If this was you, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2024 PEMS. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Suspicious Activity Detected

        We detected suspicious activity on your PEMS account:

        Activity: ${activity}
        ${ip ? `IP Address: ${ip}` : ''}
        ${userAgent ? `Device: ${userAgent}` : ''}
        Time: ${new Date().toLocaleString()}

        Recommended Actions:
        - Review your account activity
        - Change your password immediately
        - Enable multi-factor authentication if not already enabled
        - Contact support if you don't recognize this activity

        Change password: ${process.env.FRONTEND_URL}/auth/reset-password

        If this was you, you can safely ignore this email.

        © 2024 PEMS. All rights reserved.
      `
    }
  }
}

export const emailService = new EmailService()