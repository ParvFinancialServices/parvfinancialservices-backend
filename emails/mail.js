import nodemailer from 'nodemailer';
import loadTemplate from './templateLoader.js';

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMPT_MAIL || 'abhishek24033c@gmail.com',
    // user: 'abhishek24033c@gmail.com',
    // pass: "  ",
    pass: process.env.SMPT_PASS || 'zxac ldkb zuch xiwc',
  },
});

async function sendMail(templateName, data, subject = "Notification") {
  try {
    const html = loadTemplate(templateName, data);
// console.log("EMAIL_USER:", process.env.EMAIL_USER);
// console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "Loaded" : "Missing");

    await transporter.sendMail({
      from: process.env.SMPT_MAIL,
      to: data.email,
      subject,
      html,
    });

    return { err: null };
  } catch (err) {
    console.error("Mail Error:", err);
    return { err };
  }
}

export default sendMail;
