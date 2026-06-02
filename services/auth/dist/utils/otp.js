"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOtp = generateOtp;
exports.saveOtp = saveOtp;
exports.verifyOtp = verifyOtp;
const redis_1 = __importDefault(require("../config/redis"));
/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
/**
 * Saves the OTP to Redis with a 5-minute expiration.
 */
async function saveOtp(userIdOrPhone, otp) {
    const cacheKey = `otp:${userIdOrPhone}`;
    // Set value and configure it to expire in 300 seconds (5 minutes)
    await redis_1.default.set(cacheKey, otp, {
        EX: 300
    });
}
/**
 * Verifies the OTP by checking against the value stored in Redis.
 */
async function verifyOtp(userIdOrPhone, otpInput) {
    const cacheKey = `otp:${userIdOrPhone}`;
    const storedOtp = await redis_1.default.get(cacheKey);
    if (!storedOtp) {
        return false; // OTP expired or does not exist
    }
    const isValid = storedOtp === otpInput;
    if (isValid) {
        // Delete OTP after successful verification to prevent reuse
        await redis_1.default.del(cacheKey);
    }
    return isValid;
}
