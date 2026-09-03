import { env } from "../config/env";

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailService {
  send(options: EmailOptions): Promise<void>;
}

class ConsoleEmailService implements EmailService {
  async send(options: EmailOptions): Promise<void> {
    if (env.NODE_ENV === "test") {
      return;
    }
    console.log(`[EmailService] Sending email to: ${options.to}`);
    console.log(`[EmailService] Subject: ${options.subject}`);
    console.log(`[EmailService] Body: ${options.text}`);
  }
}

export const emailService: EmailService = new ConsoleEmailService();
