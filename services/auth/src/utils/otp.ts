import redisClient from '../config/redis';

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Saves the OTP to Redis with a 5-minute expiration.
 */
export async function saveOtp(userIdOrPhone: string, otp: string): Promise<void> {
  const cacheKey = `otp:${userIdOrPhone}`;
  // Set value and configure it to expire in 300 seconds (5 minutes)
  await redisClient.set(cacheKey, otp, {
    EX: 300
  });
}

/**
 * Verifies the OTP by checking against the value stored in Redis.
 */
export async function verifyOtp(userIdOrPhone: string, otpInput: string): Promise<boolean> {
  const cacheKey = `otp:${userIdOrPhone}`;
  const storedOtp = await redisClient.get(cacheKey);
  
  if (!storedOtp) {
    return false; // OTP expired or does not exist
  }

  const isValid = storedOtp === otpInput;

  if (isValid) {
    // Delete OTP after successful verification to prevent reuse
    await redisClient.del(cacheKey);
  }

  return isValid;
}
