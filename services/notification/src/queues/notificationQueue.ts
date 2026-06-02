import Queue from 'bull';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export interface NotificationJobData {
  tenantId: string;
  recipient: string; // email address, phone number, or FCM device token
  type: 'sms' | 'email' | 'push';
  title: string;
  body: string;
}

// Initialize Bull Queue backed by Redis
export const notificationQueue = new Queue<NotificationJobData>('notification-jobs', REDIS_URL);

// Background Worker Processor
notificationQueue.process(async (job) => {
  const { tenantId, recipient, type, title, body } = job.data;
  
  console.log(`[NOTIFICATION WORKER] Starting job ${job.id} - Type: ${type} for Tenant: ${tenantId}`);

  // Simulated Delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    switch (type) {
      case 'sms':
        // Simulated Twilio Client integration:
        // await twilioClient.messages.create({ body, to: recipient, from: process.env.TWILIO_PHONE })
        console.log(`[TWILIO SIMULATOR] Sent SMS to ${recipient}: "${body}"`);
        break;

      case 'email':
        // Simulated SendGrid / SMTP integration:
        // await sgMail.send({ to: recipient, from: 'no-reply@academy.com', subject: title, text: body })
        console.log(`[SENDGRID SIMULATOR] Sent Email to ${recipient}: Subject: "${title}" - Body: "${body}"`);
        break;

      case 'push':
        // Simulated FCM Web/Mobile push integration:
        // await admin.messaging().send({ token: recipient, notification: { title, body } })
        console.log(`[FCM SIMULATOR] Sent FCM Push Notification to device ${recipient}: Title: "${title}"`);
        break;

      default:
        throw new Error(`Unsupported notification channel provider: ${type}`);
    }
    
    console.log(`[NOTIFICATION WORKER] Successfully dispatched job ${job.id}`);
  } catch (error: any) {
    console.error(`[NOTIFICATION WORKER] Failed job ${job.id}:`, error.message);
    throw error; // Let Bull handle automatic retries
  }
});
