const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOTPEmail = async (email, otp, name) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset OTP - CMS Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10b981; margin: 0;">CMS Platform</h1>
          <p style="color: #6b7280; margin: 5px 0;">Password Reset Request</p>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 12px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${name},</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            We received a request to reset your password. Use the OTP below to reset your password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #10b981; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 8px; display: inline-block;">
              ${otp}
            </div>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            This OTP will expire in 10 minutes
          </p>
        </div>
        
        <div style="background: #fef3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 12px;">
          <p>© 2024 CMS Platform. All rights reserved.</p>
        </div>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };