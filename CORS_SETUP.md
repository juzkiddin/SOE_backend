# CORS Configuration for Production Deployment

## Environment Variables Setup

Create a `.env` file in your project root with the following configuration:

```bash
# Production Environment
NODE_ENV=production

# CORS Configuration - CRITICAL for cross-origin requests
# Replace with your actual frontend domain(s)
ALLOWED_ORIGINS="https://your-frontend-domain.com,https://www.your-frontend-domain.com"

# Example for SnapOrderEat:
# ALLOWED_ORIGINS="https://snapordereat.com,https://www.snapordereat.com,https://app.snapordereat.com"

# Cookie Security
COOKIE_SECRET="your-super-secret-cookie-signing-key-here"

# Database and other configs...
DATABASE_URL="your-database-url"
OTP_DURATION_MINUTES=5
OTP_MAX_ATTEMPTS=5
```

## Frontend Configuration

### For Next.js applications, make API calls with credentials:

```javascript
// Correct way to call the API
const response = await fetch('https://otpapi.snapordereat.in/otp/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // IMPORTANT: This sends cookies cross-origin
  body: JSON.stringify({
    tableId: 'your-table-id'
  })
});
```

### For axios:

```javascript
// Configure axios with credentials
axios.defaults.withCredentials = true;

// Or per request
const response = await axios.post('https://otpapi.snapordereat.in/otp/generate', {
  tableId: 'your-table-id'
}, {
  withCredentials: true
});
```

## Server Configuration Requirements

### 1. HTTPS Required for Cross-Site Cookies
- Your API must be served over HTTPS in production
- Frontend must also be served over HTTPS
- This is required for `SameSite=None; Secure` cookies

### 2. DNS/Domain Setup
- API: `https://otpapi.snapordereat.in`
- Frontend: `https://your-app-domain.com`
- Both must have valid SSL certificates

### 3. Reverse Proxy Configuration (if using nginx/Apache)
Make sure your reverse proxy forwards the correct headers:

```nginx
# nginx configuration
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Testing CORS Setup

### 1. Browser Network Tab
- Check if preflight OPTIONS requests succeed (200 status)
- Verify response headers include:
  - `Access-Control-Allow-Origin: https://your-frontend-domain.com`
  - `Access-Control-Allow-Credentials: true`

### 2. Cookie Verification
- Check if `Set-Cookie` header includes `SameSite=None; Secure`
- Verify cookie is sent in subsequent requests

### 3. Common Error Messages and Solutions

#### Error: "CORS policy violation"
**Solution:** Add your frontend domain to `ALLOWED_ORIGINS` environment variable

#### Error: "Cannot use wildcard in Access-Control-Allow-Origin when credentials flag is true"
**Solution:** Specify exact domains in `ALLOWED_ORIGINS`, not `*`

#### Error: "Cookie blocked by SameSite policy"
**Solution:** Ensure both API and frontend are served over HTTPS

## Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure `ALLOWED_ORIGINS` with your frontend domain(s)
- [ ] Ensure API is served over HTTPS
- [ ] Ensure frontend is served over HTTPS
- [ ] Test cookie creation and sending across domains
- [ ] Verify CORS preflight requests work
- [ ] Test rate limiting works per user, not globally

## Quick Test

Use this curl command to test your CORS setup:

```bash
# Replace with your actual domains
curl -H "Origin: https://your-frontend-domain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://otpapi.snapordereat.in/otp/generate
```

Expected response should include CORS headers allowing your origin. 