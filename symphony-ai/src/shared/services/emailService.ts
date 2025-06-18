// Note: This is a frontend-only implementation for demo purposes.
// In a production app, email sending should be done on the backend/serverless functions.

interface EmailInvitation {
  to: string;
  inviterName: string;
  inviteeName: string;
  contextName: string;
  inviteCode: string;
  appUrl?: string;
}

export const emailService = {
  // Frontend email service (for demo - use backend in production)
  async sendFamilyInvitationEmail(invitation: EmailInvitation): Promise<boolean> {
    const fromEmail = process.env.REACT_APP_FROM_EMAIL || 'noreply@symphony-ai.com';
    const appUrl = invitation.appUrl || window.location.origin;
    
    // For demo purposes, we'll use a simple fetch to a webhook or serverless function
    // In production, this should be handled by your backend
    
    const emailData = {
      to: invitation.to,
      from: fromEmail,
      subject: `You're invited to join ${invitation.contextName} on Symphony`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Family Invitation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3B82F6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .invite-code { background: #1F2937; color: #F3F4F6; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 18px; text-align: center; margin: 20px 0; }
            .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're Invited to Join the Family!</h1>
            </div>
            <div class="content">
              <p>Hi ${invitation.inviteeName}!</p>
              
              <p><strong>${invitation.inviterName}</strong> has invited you to join their family on <strong>Symphony</strong> - the personal operating system for families.</p>
              
              <p>With Symphony, you can:</p>
              <ul>
                <li>📋 Share tasks and SOPs (Standard Operating Procedures)</li>
                <li>📅 Coordinate family schedules and planning</li>
                <li>🍽️ Plan meals together</li>
                <li>✅ Assign and track family responsibilities</li>
              </ul>
              
              <h3>Your Invitation Code:</h3>
              <div class="invite-code">${invitation.inviteCode}</div>
              
              <h3>How to Join:</h3>
              <ol>
                <li>Click the button below to go to Symphony</li>
                <li>Create your account or sign in</li>
                <li>Click "Join Family" and enter your invitation code</li>
                <li>Start collaborating with your family!</li>
              </ol>
              
              <a href="${appUrl}?invite=${invitation.inviteCode}" class="button">Join Family Now</a>
              
              <p><small>This invitation expires in 7 days. If you have any questions, just reply to this email.</small></p>
            </div>
            <div class="footer">
              <p>Sent with ❤️ from Symphony<br>
              The Personal Operating System for Families</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${invitation.inviteeName}!

${invitation.inviterName} has invited you to join their family on Symphony.

Your invitation code: ${invitation.inviteCode}

To join:
1. Go to ${appUrl}
2. Create account or sign in  
3. Click "Join Family" and enter code: ${invitation.inviteCode}

This invitation expires in 7 days.

Welcome to the family!
      `
    };

    try {
      // Option 1: Use a serverless function (recommended)
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      if (response.ok) {
        console.log('✅ Email sent successfully via serverless function');
        return true;
      }
      
      // Option 2: Fallback - direct SendGrid (not recommended for production)
      console.warn('⚠️ Serverless function failed, trying direct SendGrid (not secure for production)');
      return await this.sendDirectSendGrid(emailData);
      
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      
      // Option 3: Fallback to manual process
      console.log('📧 Showing manual invitation details instead');
      this.showManualInvitationModal(invitation);
      return false;
    }
  },

  // Direct SendGrid (not recommended for production - API key exposed)
  async sendDirectSendGrid(emailData: any): Promise<boolean> {
    try {
      // This would require CORS proxy or serverless function in production
      console.warn('🚨 Direct SendGrid not implemented (API key security)');
      console.log('📧 Email would be sent:', emailData);
      return false;
    } catch (error) {
      console.error('Direct SendGrid failed:', error);
      return false;
    }
  },

  // Manual invitation modal as fallback
  showManualInvitationModal(invitation: EmailInvitation): void {
    const message = `
📧 FAMILY INVITATION EMAIL

To: ${invitation.to}
From: ${invitation.inviterName}

Subject: You're invited to join ${invitation.contextName} on Symphony

Hi ${invitation.inviteeName}!

${invitation.inviterName} has invited you to join their family on Symphony.

Your invitation code: ${invitation.inviteCode}

To join:
1. Go to ${window.location.origin}
2. Create account or sign in
3. Click "Join Family" and enter your code

Please copy this message and send it to ${invitation.to} manually.
    `;

    alert(message);
    
    // Also copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message).then(() => {
        console.log('📋 Invitation message copied to clipboard');
      });
    }
  }
};