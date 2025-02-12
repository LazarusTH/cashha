type EmailParams = {
  to: string;
  subject: string;
  html?: string;
  template?: string;
  data?: any;
  attachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
}

export async function sendEmail({ to, subject, html, template, data, attachments }: EmailParams) {
  // Implement your email sending logic here
  // Example: using nodemailer, SendGrid, etc.
  console.log('Sending email:', { 
    to, 
    subject, 
    html, 
    template, 
    data,
    attachments: attachments?.map(a => a.filename)
  });
}