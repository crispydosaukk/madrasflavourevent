import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Create a transporter using your email service provider details
    // It's recommended to store these in environment variables (e.g., process.env.EMAIL_USER)
    const transporter = nodemailer.createTransport({
      service: 'gmail', // You can use other services like 'sendgrid', 'smtp', etc.
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com', // Replace with your email or use ENV
        pass: process.env.EMAIL_PASS || 'your-app-password',    // Replace with your app password or use ENV
      },
    });

    const serviceName = data.serviceType || 'Booking';
    
    const mailOptions = {
      from: `"Madras Flavours Events" <${process.env.EMAIL_USER || 'your-email@gmail.com'}>`,
      to: 'rahulbadugu22@gmail.com, catering@madrasflavours.co.uk, Digitalbotsolutions@gmail.com', // The requested recipient emails
      subject: `New ${serviceName} Request`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #F5A623; text-align: center; border-bottom: 2px solid #F5A623; padding-bottom: 10px;">New Booking Request</h2>
          <p style="font-size: 16px; color: #333;">Hello,</p>
          <p style="font-size: 16px; color: #333;">You have received a new booking request from your website. Here are the details:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tbody>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 30%;">Name:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.email || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.phone || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Event Date:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.date || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Time:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.timeOfDay || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Guests:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.guests || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Event Type:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.eventType || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Service Type:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.serviceType || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Package:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.package || 'Not Selected'}</td>
              </tr>
            </tbody>
          </table>
          
          ${data.message ? `
          <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #F5A623;">
            <p style="margin: 0; font-weight: bold;">Message from Customer:</p>
            <p style="margin: 10px 0 0 0; white-space: pre-wrap;">${data.message}</p>
          </div>
          ` : ''}
          
          <p style="margin-top: 30px; font-size: 14px; color: #777; text-align: center;">
            This email was automatically generated from your website's booking form.
          </p>
        </div>
      `,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Email sent successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
