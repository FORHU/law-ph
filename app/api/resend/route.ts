import { NextResponse } from 'next/server';
import { resend } from '@/lib/resend';

export async function POST(req: Request) {
  try {
    const { to, subject, body, type, eventDetails } = await req.json();

    if (!to || (!body && !eventDetails)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let emailContent = body;
    let emailSubject = subject;

    if (type === 'schedule' && eventDetails) {
      emailSubject = `Event Scheduled: ${eventDetails.eventType}`;
      emailContent = `
        <h2>Event Confirmation</h2>
        <p>A new event has been scheduled with the following details:</p>
        <ul>
          <li><strong>Event Type:</strong> ${eventDetails.eventType}</li>
          <li><strong>Date & Time:</strong> ${eventDetails.dateTime}</li>
          <li><strong>Notes:</strong> ${eventDetails.notes || 'None'}</li>
        </ul>
        <p>Thank you for using our legal consultation service.</p>
      `;
    }

    const cleanTo = to.replace(/\s+/g, '.').toLowerCase(); // Fix accidental spaces like "s ubaguio edu" to "s.ubaguio.edu"
    
    // Simple robust Markdown to Email HTML
    const markdownToHtml = (md: string) => {
      let html = md
        // Headers
        .replace(/^### (.*$)/gim, '<h3 style="margin-top: 20px; margin-bottom: 8px; color: #1f2937; font-size: 16px;">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 style="margin-top: 24px; margin-bottom: 12px; color: #111827; font-size: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 style="margin-top: 28px; margin-bottom: 16px; color: #000000; font-size: 24px;">$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        // Italics
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        // List Items
        .replace(/^\s*[-*]\s+(.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 6px;">$1</li>');

      // Wrap consecutive <li> into <ul>
      html = html.replace(/(<li.*?>.*?<\/li>\n*)+/g, '<ul style="margin-top: 8px; margin-bottom: 16px; padding-left: 20px;">$&</ul>');

      // Split by double newlines to create paragraphs
      const blocks = html.split(/\n\n+/);
      html = blocks.map(block => {
        // Don't wrap if it's already a block element like h1, h2, h3, or ul
        if (block.trim().match(/^(<h|<ul|<li)/i)) {
          return block;
        }
        return `<p style="margin-bottom: 16px; line-height: 1.6; color: #374151;">${block.replace(/\n/g, '<br/>')}</p>`;
      }).join('\n');

      return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 800px; padding: 20px; background: #ffffff;">${html}</div>`;
    };

    const formattedContent = type === 'schedule' ? emailContent : markdownToHtml(emailContent);

    const { data, error } = await resend.emails.send({
      from: 'ilovelawyer <updates@ilovelawyer.com>', // Verified domain
      to: [cleanTo],
      subject: emailSubject || 'Update from Legal Consultation',
      html: formattedContent,
    });

    if (error) {
      console.error('Resend Error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
