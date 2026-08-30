#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const { silentExit } = require('./helpers');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const isEnabled = (value) => value === 'true' || value === true;

function usage() {
  console.log('Usage: node config/test-email.js <recipient-email>');
  console.log('Example: node config/test-email.js 1987709834@qq.com');
}

function buildTransporterOptions() {
  const transporterOptions = {
    secure: process.env.EMAIL_ENCRYPTION === 'tls',
    requireTls: process.env.EMAIL_ENCRYPTION === 'starttls',
    tls: {
      rejectUnauthorized: !isEnabled(process.env.EMAIL_ALLOW_SELFSIGNED),
    },
  };

  if (process.env.EMAIL_ENCRYPTION_HOSTNAME) {
    transporterOptions.tls.servername = process.env.EMAIL_ENCRYPTION_HOSTNAME;
  }

  if (process.env.EMAIL_SERVICE) {
    transporterOptions.service = process.env.EMAIL_SERVICE;
  } else {
    transporterOptions.host = process.env.EMAIL_HOST;
    transporterOptions.port = Number(process.env.EMAIL_PORT ?? 25);
  }

  if (process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD) {
    transporterOptions.auth = {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    };
  }

  return transporterOptions;
}

function validateEnv() {
  const missing = [];

  if (!process.env.EMAIL_FROM) {
    missing.push('EMAIL_FROM');
  }

  if (!process.env.EMAIL_SERVICE) {
    if (!process.env.EMAIL_HOST) {
      missing.push('EMAIL_HOST');
    }

    if (!process.env.EMAIL_PORT) {
      missing.push('EMAIL_PORT');
    }
  }

  if (missing.length > 0) {
    console.red(`Missing required environment variables: ${missing.join(', ')}`);
    silentExit(1);
  }

  if ((process.env.EMAIL_USERNAME && !process.env.EMAIL_PASSWORD) || (!process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD)) {
    console.orange(
      'Warning: EMAIL_USERNAME and EMAIL_PASSWORD should either both be set or both be omitted. Continuing without SMTP auth.',
    );
  }
}

function describeMode() {
  if (process.env.EMAIL_SERVICE) {
    return `service:${process.env.EMAIL_SERVICE}`;
  }

  return `${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT ?? 25}`;
}

async function runSmtpCheck() {
  const transporter = nodemailer.createTransport(buildTransporterOptions());
  await transporter.verify();
  return transporter;
}

async function sendTestEmail(recipient) {
  const transporter = await runSmtpCheck();
  const fromName = process.env.EMAIL_FROM_NAME || process.env.APP_TITLE || 'LibreChat';
  const fromEmail = process.env.EMAIL_FROM;

  return transporter.sendMail({
    from: { name: fromName, address: fromEmail },
    to: recipient,
    subject: 'LibreChat email configuration test',
    text: 'If you received this email, the LibreChat email configuration is working.',
    html: '<p>If you received this email, the LibreChat email configuration is working.</p>',
    envelope: {
      from: fromEmail,
      to: recipient,
    },
  });
}

async function main() {
  const recipient = process.argv[2];

  if (!recipient || recipient === '--help' || recipient === '-h') {
    usage();
    silentExit(recipient ? 0 : 1);
  }

  console.purple('-----------------------------');
  console.purple('Test email configuration');
  console.purple('-----------------------------');
  console.orange(`Recipient: ${recipient}`);
  console.orange(`Mode: ${describeMode()}`);

  validateEnv();

  try {
    const info = await sendTestEmail(recipient);

    console.green('SMTP verification: passed');
    console.green(`Message ID: ${info.messageId || 'n/a'}`);
    console.green(`Accepted: ${(info.accepted || []).join(', ') || 'n/a'}`);
    console.green(`Rejected: ${(info.rejected || []).join(', ') || 'n/a'}`);
    silentExit(0);
  } catch (error) {
    console.red('Email test failed');
    console.error(error);
    silentExit(1);
  }
}

process.on('uncaughtException', (error) => {
  console.error('There was an uncaught error:');
  console.error(error);
  silentExit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('There was an unhandled rejection:');
  console.error(error);
  silentExit(1);
});

main();
