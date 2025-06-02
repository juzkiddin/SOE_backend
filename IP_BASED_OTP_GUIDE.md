# 🔄 **Updated: IP-Based OTP System - Frontend Integration Guide**

## 🎯 **Major Changes: Cookie-Free System**

The OTP API has been updated to use **IP-based tracking only**, removing all cookie dependencies. This simplifies the system significantly.

### **Key Changes:**
- ❌ **No more cookies** - No session management via cookies
- ✅ **IP-based rate limiting** - Rate limits apply per IP address
- ✅ **Simplified requests** - No need for `credentials: 'include'`
- ✅ **UUID-only verification** - OTP verification uses only UUID, no session required

---

## 📡 **Updated API Specifications**

### **1. Generate Table OTP - `POST /otp/generate`**

**Request:**
```javascript
POST http://localhost:3000/otp/generate
Content-Type: application/json
// NO COOKIES NEEDED

{
    "tableId": "table-123"
}
```

**Response (200):**
```json
{
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "attemptsLeft": 4
}
```

### **2. Generate SMS OTP - `POST /otp/smsgen`**

**Request:**
```javascript
POST http://localhost:3000/otp/smsgen
Content-Type: application/json
// NO COOKIES NEEDED

{
    "mobileNum": "+1234567890"
}
```

**Response (200):**
```json
{
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "attemptsLeft": 4
}
```

### **3. Verify OTP - `POST /otp/verify` or `POST /otp/smsverify`**

**Request:**
```javascript
POST http://localhost:3000/otp/verify
Content-Type: application/json
// NO COOKIES NEEDED

{
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "otpCode": "123456"
}
```

**Response (200):**
```json
{
    "success": true
}
```

---

## 🔧 **Updated Frontend Implementation**

### **Step 1: Updated Service Functions**

Create/Update `lib/otpService.js`:

```javascript
// lib/otpService.js

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://otpapi.snapordereat.in'
  : 'http://localhost:3000';

/**
 * Generate Table OTP
 */
export const generateTableOtp = async (tableId) => {
  const response = await fetch(`${API_BASE_URL}/otp/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // NO credentials: 'include' needed anymore!
    body: JSON.stringify({ tableId })
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after') || '30';
    throw new Error(`Rate limit exceeded. Please wait ${retryAfter} seconds.`);
  }

  if (!response.ok) {
    throw new Error('Failed to generate table OTP');
  }

  return await response.json();
};

/**
 * Generate SMS OTP
 */
export const generateSmsOtp = async (mobileNum) => {
  const response = await fetch(`${API_BASE_URL}/otp/smsgen`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // NO credentials: 'include' needed anymore!
    body: JSON.stringify({ mobileNum })
  });

  if (response.status === 400) {
    const error = await response.json();
    throw new Error(`Invalid mobile number: ${error.message[0] || error.message}`);
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after') || '30';
    throw new Error(`Rate limit exceeded. Please wait ${retryAfter} seconds.`);
  }

  if (response.status === 500) {
    throw new Error('SMS service temporarily unavailable. Please try again later.');
  }

  if (!response.ok) {
    throw new Error('Failed to generate SMS OTP');
  }

  return await response.json();
};

/**
 * Verify OTP (works for both table and SMS OTPs)
 */
export const verifyOtp = async (uuid, otpCode) => {
  const response = await fetch(`${API_BASE_URL}/otp/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // NO credentials: 'include' needed anymore!
    body: JSON.stringify({ uuid, otpCode })
  });

  if (response.status === 400) {
    const error = await response.json();
    throw new Error(`Invalid OTP: ${error.message[0] || error.message}`);
  }

  if (!response.ok) {
    throw new Error('Failed to verify OTP');
  }

  return await response.json();
};

/**
 * Validate mobile number format
 */
export const isValidMobileNumber = (mobileNum) => {
  const regex = /^\+?[1-9]\d{1,14}$/;
  return regex.test(mobileNum);
};
```

### **Step 2: Updated React Component**

```javascript
// components/OtpForm.jsx
import { useState, useEffect } from 'react';
import { generateTableOtp, generateSmsOtp, verifyOtp, isValidMobileNumber } from '../lib/otpService';

const OtpForm = ({ type = 'table', identifier, onSuccess, onError }) => {
  // type: 'table' | 'sms'
  // identifier: tableId for table OTP, mobileNum for SMS OTP

  const [step, setStep] = useState('generate'); // 'generate' | 'verify'
  const [otpCode, setOtpCode] = useState('');
  const [uuid, setUuid] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [retryCountdown, setRetryCountdown] = useState(0);

  // Handle retry countdown
  useEffect(() => {
    if (retryCountdown > 0) {
      const timer = setTimeout(() => setRetryCountdown(retryCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [retryCountdown]);

  // Generate OTP
  const handleGenerateOtp = async () => {
    setError('');
    setLoading(true);

    try {
      let result;
      
      if (type === 'table') {
        result = await generateTableOtp(identifier);
      } else if (type === 'sms') {
        if (!isValidMobileNumber(identifier)) {
          throw new Error('Please enter a valid mobile number with country code');
        }
        result = await generateSmsOtp(identifier);
      }

      setUuid(result.uuid);
      setAttemptsLeft(result.attemptsLeft);
      setStep('verify');

      if (type === 'sms') {
        alert(`SMS sent to ${identifier}. Please check your messages.`);
      }

    } catch (error) {
      setError(error.message);
      
      // Handle rate limiting
      if (error.message.includes('Rate limit exceeded')) {
        const seconds = error.message.match(/(\d+) seconds/)?.[1];
        if (seconds) {
          setRetryCountdown(parseInt(seconds));
        }
      }
      
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (otpCode.length !== 6) {
      setError('Please enter a 6-digit OTP code');
      setLoading(false);
      return;
    }

    try {
      const result = await verifyOtp(uuid, otpCode);
      
      if (result.success) {
        onSuccess?.({ type, identifier, uuid });
        alert(`${type === 'table' ? 'Table' : 'Mobile'} verification successful!`);
      } else {
        setError('Invalid OTP code. Please try again.');
      }
      
    } catch (error) {
      setError(error.message);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-form">
      <h2>
        {type === 'table' ? `Verify Table: ${identifier}` : `Verify Mobile: ${identifier}`}
      </h2>
      
      {step === 'generate' && (
        <div>
          <p>
            {type === 'table' 
              ? 'Generate OTP for table access' 
              : 'We will send you a verification code via SMS'
            }
          </p>
          
          {error && <div className="error">{error}</div>}
          
          <button 
            onClick={handleGenerateOtp}
            disabled={loading || retryCountdown > 0}
          >
            {loading 
              ? (type === 'table' ? 'Generating...' : 'Sending SMS...') 
              : retryCountdown > 0 
                ? `Wait ${retryCountdown}s` 
                : (type === 'table' ? 'Generate OTP' : 'Send SMS Code')
            }
          </button>
          
          <div className="attempts-info">
            Attempts remaining: {attemptsLeft}/5
          </div>
        </div>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerifyOtp}>
          <div className="form-group">
            <label htmlFor="otpCode">Enter OTP Code:</label>
            <input
              type="text"
              id="otpCode"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              required
              disabled={loading}
              autoFocus
            />
          </div>

          {error && <div className="error">{error}</div>}
          
          <div className="form-actions">
            <button type="button" onClick={() => setStep('generate')} disabled={loading}>
              Back
            </button>
            <button type="submit" disabled={loading || otpCode.length !== 6}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
          
          <button type="button" onClick={handleGenerateOtp} disabled={loading}>
            Resend {type === 'table' ? 'OTP' : 'SMS'}
          </button>
        </form>
      )}
    </div>
  );
};

export default OtpForm;
```

### **Step 3: Usage Examples**

```javascript
// Table OTP Example
<OtpForm 
  type="table"
  identifier="table-123"
  onSuccess={({ type, identifier, uuid }) => {
    console.log(`${type} OTP verified for ${identifier}`);
    // Handle table access
  }}
  onError={(error) => console.error('OTP Error:', error)}
/>

// SMS OTP Example  
<OtpForm 
  type="sms"
  identifier="+1234567890"
  onSuccess={({ type, identifier, uuid }) => {
    console.log(`Mobile ${identifier} verified successfully`);
    // Update user profile, set authentication state, etc.
  }}
  onError={(error) => console.error('SMS OTP Error:', error)}
/>
```

---

## 🔍 **Rate Limiting Behavior**

### **IP-Based Rate Limiting:**
- ✅ **5 attempts per 30 seconds per IP address**
- ⚠️ **Shared limits**: Multiple users behind same IP share rate limits
- ✅ **Automatic reset**: Limits reset after 30 seconds
- ✅ **All endpoints**: Rate limiting applies to both table and SMS OTP generation

### **Rate Limit Headers:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1234567890
Retry-After: 30
```

---

## ⚠️ **Important Changes for Frontend**

### **What Changed:**
1. ❌ **Remove `credentials: 'include'`** from all fetch requests
2. ❌ **No more session errors** - "No active OTP session" error no longer exists
3. ✅ **Simplified verification** - Only UUID and OTP code needed
4. ✅ **Cleaner requests** - No cookie headers to manage

### **What Stayed the Same:**
1. ✅ **Same response formats** for all endpoints
2. ✅ **Same error codes** (400, 429, 500)
3. ✅ **Same rate limiting behavior** (just IP-based now)
4. ✅ **Same OTP verification flow**

### **Potential Issues:**
1. ⚠️ **Shared IP rate limits**: Multiple users behind NAT/proxy share limits
2. ⚠️ **No session persistence**: Each request is independent
3. ⚠️ **UUID management**: Frontend must store UUIDs for verification

---

## 🧪 **Updated Testing**

### **Test IP-Based Rate Limiting:**

```javascript
// Test script to verify IP-based rate limiting
const testIpRateLimit = async () => {
  for (let i = 1; i <= 6; i++) {
    try {
      const result = await generateTableOtp('test-table');
      console.log(`Attempt ${i}: Success - ${result.attemptsLeft} attempts left`);
    } catch (error) {
      console.log(`Attempt ${i}: Error - ${error.message}`);
      if (error.message.includes('Rate limit exceeded')) {
        console.log('Rate limit reached as expected');
        break;
      }
    }
  }
};
```

### **Test Cross-User Impact:**

```javascript
// If multiple users are on same IP, they will share rate limits
// This is expected behavior with IP-based system
const testSharedRateLimit = async () => {
  // User 1 generates 5 OTPs
  for (let i = 0; i < 5; i++) {
    await generateTableOtp(`user1-table-${i}`);
  }
  
  // User 2 should now be rate limited (if on same IP)
  try {
    await generateTableOtp('user2-table');
  } catch (error) {
    console.log('User 2 affected by User 1 rate limit (expected with IP-based system)');
  }
};
```

---

## 🚀 **Production Considerations**

### **1. IP-Based Limitations:**
- Users behind corporate NAT/proxy share rate limits
- Mobile users on carrier NAT may be affected
- Consider implementing additional user-based limits if needed

### **2. Monitoring:**
- Monitor rate limit hit rates by IP
- Watch for legitimate users getting blocked
- Consider whitelisting known good IPs if needed

### **3. Scaling:**
- Rate limit data stored in database (not memory)
- Scales horizontally across multiple servers
- Clean up old rate limit records periodically

---

## ✅ **Migration Checklist**

### **Frontend Changes Required:**
- [ ] Remove `credentials: 'include'` from all OTP API calls
- [ ] Remove session error handling (401 "No active OTP session")
- [ ] Update error handling for simplified error cases
- [ ] Test rate limiting behavior with multiple users
- [ ] Update documentation for IP-based system

### **Backend Changes (Already Done):**
- [x] Removed cookie parser middleware
- [x] Removed cookie-based session management
- [x] Updated rate limiting to IP-only
- [x] Simplified OTP verification (UUID-only)
- [x] Updated CORS to not require credentials

This simplified IP-based system is now easier to integrate, has fewer dependencies, and works seamlessly across different deployment scenarios! 🎉 