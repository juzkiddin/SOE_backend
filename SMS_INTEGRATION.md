# Twilio SMS Integration for OTP

## Overview

The `/otp/smsgen` endpoint now automatically sends OTP codes via SMS using Twilio when an SMS OTP is generated. **If SMS sending fails, the entire operation fails with a 500 error.**

## Environment Variables Required

Add these environment variables to your `.env` file:

```bash
# Twilio Configuration
ACCOUNT_SID=your_twilio_account_sid
ACCOUNT_AUTHTKN=your_twilio_auth_token
ACCOUNT_NUMBER=your_twilio_phone_number
```

### How to get Twilio credentials:

1. **Sign up at [Twilio](https://www.twilio.com/)**
2. **Get Account SID and Auth Token** from Twilio Console Dashboard
3. **Get a phone number** from Twilio Phone Numbers section

Example values:
```bash
ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ACCOUNT_AUTHTKN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ACCOUNT_NUMBER=+1234567890
```

## How It Works

When a user calls `POST /otp/smsgen`:

1. ✅ **Rate limiting check** (same as before)
2. ✅ **Generate 6-digit OTP** (same as before)
3. ✅ **Save to database** (same as before)
4. 🆕 **Send SMS via Twilio** with message: `"Your OTP for SnapOrderEat Login is {otpCode}"`
5. ✅ **Return UUID and attempts left** (only if SMS succeeds)

## SMS Message Format

```
Your OTP for SnapOrderEat Login is 123456
```

## Error Handling

The SMS functionality is **blocking** and **required**:

- ✅ **If SMS sends successfully**: OTP generation succeeds, returns UUID
- ❌ **If SMS fails**: OTP is deleted from database, returns 500 error
- ❌ **If Twilio not configured**: Returns 500 error

This ensures users only receive OTP UUIDs when they can actually receive the SMS.

## API Responses

### Success Response (200):
```json
{
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "attemptsLeft": 4
}
```

### Error Responses:
- `400 Bad Request` - Invalid mobile number format
- `429 Too Many Requests` - Rate limit exceeded (5 attempts per 30 seconds)
- `500 Internal Server Error` - Failed to send SMS

### Error Response (500):
```json
{
    "statusCode": 500,
    "message": "Failed to send sms"
}
```

## Logging

The service logs the following:

```javascript
// Success
"SMS sent successfully to +1234567890, Message ID: SM1234567890abcdef"

// Failure (before throwing 500 error)
"Failed to send SMS to +1234567890: [error message]"

// Configuration issues (before throwing 500 error)
"Twilio credentials not found. SMS functionality will be disabled."
"ACCOUNT_NUMBER not configured"
```

## Testing SMS Integration

### 1. Test with valid Twilio credentials:

```javascript
// This should send an actual SMS and return 200
const response = await fetch('/otp/smsgen', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ mobileNum: '+1234567890' })
});

if (response.status === 200) {
  const data = await response.json();
  console.log('OTP generated and SMS sent:', data);
} else if (response.status === 500) {
  console.error('Failed to send SMS');
}
```

### 2. Test without Twilio credentials:

```javascript
// This should return 500 error
const response = await fetch('/otp/smsgen', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ mobileNum: '+1234567890' })
});

// Expected: response.status === 500
// Expected: response.json() === { "statusCode": 500, "message": "Failed to send sms" }
```

## Production Considerations

### 1. **Twilio Pricing**
- Check [Twilio SMS pricing](https://www.twilio.com/sms/pricing) for your target countries
- Consider using Twilio's free trial credits for testing

### 2. **Phone Number Verification**
- Verify your Twilio phone number can send to your target countries
- Some countries require sender ID registration

### 3. **Rate Limiting**
- Twilio has its own rate limits (varies by account type)
- Your API rate limiting (5 per 30 seconds) helps prevent Twilio overuse

### 4. **Error Monitoring**
- Monitor SMS delivery rates in Twilio Console
- Set up alerts for SMS failures
- **Important**: Monitor 500 error rates as they indicate SMS delivery issues

### 5. **Security**
- Keep Twilio credentials secure and never commit to version control
- Use Twilio's webhook security for production

## Troubleshooting

### Common Issues:

#### ❌ 500 Error: "Failed to send sms"
**Possible Causes:**
- Missing Twilio credentials (`ACCOUNT_SID`, `ACCOUNT_AUTHTKN`, `ACCOUNT_NUMBER`)
- Invalid Twilio credentials
- Twilio service temporarily unavailable
- Invalid recipient phone number (unverified on trial accounts)
- Insufficient Twilio account balance

**Solutions:**
1. **Check environment variables** are set correctly
2. **Verify Twilio credentials** in Twilio Console
3. **Check Twilio Console logs** for specific error details
4. **Verify recipient number** (for trial accounts)
5. **Check account balance** and billing status

#### ❌ SMS not received (but API returns 200)
This shouldn't happen with the new implementation, but if it does:
- Check Twilio Console delivery logs
- Verify phone number format and country support

#### ❌ "The number +X is unverified" (Trial accounts)
**Solution:** Verify the recipient number in Twilio Console, or upgrade to paid account

## Development vs Production

### Development:
```bash
# Use Twilio trial account
ACCOUNT_SID=ACxxxxxxxxxx_trial_account
ACCOUNT_AUTHTKN=xxxxxxxxxx
ACCOUNT_NUMBER=+1234567890  # Trial number
```

### Production:
```bash
# Use Twilio production account
ACCOUNT_SID=ACxxxxxxxxxx_production_account  
ACCOUNT_AUTHTKN=xxxxxxxxxx
ACCOUNT_NUMBER=+1234567890  # Verified production number
```

## Frontend Error Handling

Update your frontend to handle the new 500 error:

```javascript
const generateSmsOtp = async (mobileNum) => {
  try {
    const response = await fetch('/otp/smsgen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ mobileNum })
    });

    if (response.status === 500) {
      const error = await response.json();
      throw new Error('SMS service temporarily unavailable. Please try again later.');
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after') || '30';
      throw new Error(`Rate limit exceeded. Please wait ${retryAfter} seconds.`);
    }

    if (!response.ok) {
      throw new Error('Failed to generate OTP');
    }

    return await response.json();
  } catch (error) {
    console.error('SMS OTP Generation Error:', error);
    throw error;
  }
};
```

## Monitoring SMS Success

Monitor your application for 500 errors:

```bash
# Error logs  
grep "Failed to send SMS" logs/app.log
grep "500.*smsgen" logs/access.log

# Success logs
grep "SMS sent successfully" logs/app.log
```

Monitor via Twilio Console dashboard for detailed delivery reports and troubleshooting. 