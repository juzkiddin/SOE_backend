# SMS OTP API Documentation

## Overview

The SMS OTP functionality provides endpoints for generating and verifying OTPs via mobile numbers, working alongside the existing table-based OTP system.

## New Endpoints

### 1. Generate SMS OTP

**Endpoint:** `POST /otp/smsgen`

**Description:** Generate a new OTP for a mobile number

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
    "mobileNum": "+1234567890"
}
```

**Response (200 OK):**
```json
{
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "attemptsLeft": 4
}
```

**Response Headers:**
```
Set-Cookie: otp_attempts=...; HttpOnly; Secure; SameSite=None
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1234567890
```

**Error Responses:**
- `400 Bad Request` - Invalid mobile number format
- `429 Too Many Requests` - Rate limit exceeded (5 attempts per 30 seconds)
- `500 Internal Server Error` - Failed to send SMS

**500 Error Response:**
```json
{
    "statusCode": 500,
    "message": "Failed to send sms"
}
```

---

### 2. Verify SMS OTP

**Endpoint:** `POST /otp/smsverify`

**Description:** Verify an SMS OTP using the UUID and OTP code

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "otpCode": "123456"
}
```

**Response (200 OK):**
```json
{
    "success": true
}
```

**Error Responses:**
- `401 Unauthorized` - No active OTP session
- `400 Bad Request` - Invalid UUID or OTP format

---

## Mobile Number Validation

The API validates mobile numbers using the following rules:

**Valid Formats:**
- `+1234567890` (with country code)
- `1234567890` (without + prefix)
- Must be 1-15 digits after country code
- Cannot start with 0

**Invalid Examples:**
- ❌ `abc123` (contains letters)
- ❌ `123` (too short)
- ❌ `+0123456789` (starts with 0)
- ❌ `` (empty string)

## Integration Examples

### Frontend Integration (JavaScript/React)

```javascript
// Generate SMS OTP
const generateSmsOtp = async (mobileNum) => {
  const response = await fetch('/otp/smsgen', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for session management
    body: JSON.stringify({ mobileNum })
  });
  
  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after');
    throw new Error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
  }
  
  return response.json();
};

// Verify SMS OTP
const verifySmsOtp = async (uuid, otpCode) => {
  const response = await fetch('/otp/smsverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for session management
    body: JSON.stringify({ uuid, otpCode })
  });
  
  return response.json();
};

// Complete SMS OTP flow
const handleSmsOtpFlow = async () => {
  try {
    // Step 1: Generate OTP
    const mobileNum = '+1234567890';
    const { uuid, attemptsLeft } = await generateSmsOtp(mobileNum);
    
    console.log(`OTP generated. UUID: ${uuid}, Attempts left: ${attemptsLeft}`);
    
    // Step 2: Get OTP from user (in real app, this would be via SMS)
    const userEnteredOtp = prompt('Enter the OTP:');
    
    // Step 3: Verify OTP
    const { success } = await verifySmsOtp(uuid, userEnteredOtp);
    
    if (success) {
      console.log('SMS OTP verified successfully!');
    } else {
      console.log('Invalid OTP. Please try again.');
    }
    
  } catch (error) {
    console.error('SMS OTP error:', error.message);
  }
};
```

### Next.js API Route Example

```javascript
// pages/api/sms-otp/generate.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { mobileNum } = req.body;

  try {
    const response = await fetch(`${process.env.OTP_API_URL}/otp/smsgen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      credentials: 'include',
      body: JSON.stringify({ mobileNum })
    });

    const data = await response.json();

    // Forward the Set-Cookie header
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }

    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}
```

## Rate Limiting

- **Limit:** 5 attempts per 30 seconds per user session
- **Scope:** Per IP + session cookie combination
- **Reset:** Automatic after 30 seconds
- **Shared:** Rate limiting is shared between table OTPs and SMS OTPs

## Session Management

- **Cookies:** Automatically managed via signed HTTP-only cookies
- **Duration:** 5 minutes (configurable via `OTP_DURATION_MINUTES`)
- **Cross-origin:** Supports CORS with credentials for cross-domain requests
- **Security:** `SameSite=None; Secure` in production, `SameSite=lax` in development

## Comparison: Table OTP vs SMS OTP

| Feature | Table OTP (`/otp/generate`) | SMS OTP (`/otp/smsgen`) |
|---------|----------------------------|-------------------------|
| **Input** | `tableId` (string) | `mobileNum` (string) |
| **Validation** | Any non-empty string | Valid mobile number format |
| **Response** | Same (`uuid`, `attemptsLeft`) | Same (`uuid`, `attemptsLeft`) |
| **Verification** | `/otp/verify` or `/otp/smsverify` | `/otp/verify` or `/otp/smsverify` |
| **Rate Limiting** | Shared (5 per 30 seconds) | Shared (5 per 30 seconds) |
| **Session** | Same cookie-based system | Same cookie-based system |

## Testing

Use the provided test script to verify SMS OTP functionality:

```bash
# Test SMS OTP endpoints
node test-sms-otp.js

# Test both table and SMS OTP
node test-first-time-user.js  # Table OTP
node test-sms-otp.js          # SMS OTP
```

## Production Considerations

1. **SMS Integration:** The API generates OTP codes but doesn't send SMS. Integrate with SMS providers like:
   - Twilio
   - AWS SNS
   - Azure Communication Services

2. **Mobile Number Storage:** Mobile numbers are stored in the database for tracking but are not exposed in responses

3. **Security:** Same security measures as table OTPs:
   - Rate limiting per user
   - Session-based tracking
   - Secure cookie handling
   - HTTPS required in production

## Error Handling Best Practices

```javascript
const handleSmsOtpWithRetry = async (mobileNum) => {
  try {
    const response = await fetch('/otp/smsgen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ mobileNum })
    });

    if (response.status === 400) {
      const error = await response.json();
      throw new Error(`Invalid mobile number: ${error.message}`);
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after') || '30';
      throw new Error(`Rate limit exceeded. Please wait ${retryAfter} seconds.`);
    }

    if (response.status === 500) {
      throw new Error('SMS service temporarily unavailable. Please try again later.');
    }

    if (response.status === 401) {
      throw new Error('Session expired. Please refresh and try again.');
    }

    if (!response.ok) {
      throw new Error('Failed to generate SMS OTP. Please try again.');
    }

    return await response.json();
  } catch (error) {
    console.error('SMS OTP Generation Error:', error);
    throw error;
  }
};
```