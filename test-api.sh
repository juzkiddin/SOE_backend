#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create decrypt.js for testing decryption
cat > decrypt.js << 'EOL'
const NodeRSA = require('node-rsa');
const crypto = require('crypto');

function decryptOtp(encryptedData, publicKey, certKey) {
    // Split the components
    const [ivBase64, authTagBase64, encryptedBase64] = encryptedData.split(':');
    if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
        throw new Error('Invalid encrypted data format');
    }

    // Convert components from base64
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    // First layer: AES decryption
    const key = crypto.scryptSync(certKey, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted;
    try {
        decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
    } catch (error) {
        throw new Error('Failed to decrypt with certificate key. Invalid OTP_CERT_KEY or corrupted data.');
    }

    // Second layer: RSA decryption
    const rsaKey = new NodeRSA();
    rsaKey.importKey(publicKey, 'public');
    return rsaKey.decryptPublic(decrypted, 'utf8');
}

// Example usage:
const encryptedData = process.argv[2];
const publicKey = process.argv[3];
const certKey = process.argv[4];

if (!encryptedData || !publicKey || !certKey) {
    console.error('Usage: node decrypt.js <encryptedData> <publicKey> <certKey>');
    process.exit(1);
}

try {
    const decrypted = decryptOtp(encryptedData, publicKey, certKey);
    console.log('Decrypted OTP:', decrypted);
} catch (error) {
    console.error('Decryption failed:', error.message);
    process.exit(1);
}
EOL

# Check if required environment variables are set
if [ -z "$OTP_VERIFY_SECRET" ] || [ -z "$OTP_VERIFY_KEY" ] || [ -z "$OTP_CERT_KEY" ]; then
    echo -e "${RED}Error: OTP_VERIFY_SECRET, OTP_VERIFY_KEY, and OTP_CERT_KEY environment variables must be set${NC}"
    echo "Please set them using:"
    echo "export OTP_VERIFY_SECRET=your_verify_secret"
    echo "export OTP_VERIFY_KEY=your_verify_key"
    echo "export OTP_CERT_KEY=your_cert_key"
    exit 1
fi

# Install node-rsa if not already installed
if ! npm list node-rsa >/dev/null 2>&1; then
    echo "Installing node-rsa package..."
    npm install node-rsa
fi

echo "Testing OTP API Endpoints"
echo "------------------------"

# Base URL
BASE_URL="http://localhost:3000"

# Test variables
TABLE_ID="table123"

# Step 1: Generate OTP
echo -e "\n${GREEN}1. Generating OTP for table $TABLE_ID${NC}"
GENERATE_RESPONSE=$(curl -s -X POST "$BASE_URL/otp/generate" \
  -H "Content-Type: application/json" \
  -d "{\"tableId\": \"$TABLE_ID\"}")

echo "Generate Response:"
echo $GENERATE_RESPONSE

# Extract UUID from response
UUID=$(echo $GENERATE_RESPONSE | grep -o '"uuid":"[^"]*' | grep -o '[^"]*$')

if [ -z "$UUID" ]; then
    echo -e "${RED}Failed to get UUID from generate response${NC}"
    exit 1
fi

echo "UUID: $UUID"

# Step 2: Get OTP using client credentials
echo -e "\n${GREEN}2. Getting OTP using client credentials${NC}"
GET_RESPONSE=$(curl -s -X POST "$BASE_URL/otp/$TABLE_ID/get" \
  -H "Content-Type: application/json" \
  -d "{
    \"clientSecret\": \"$OTP_VERIFY_SECRET\",
    \"clientKey\": \"$OTP_VERIFY_KEY\"
  }")

echo "Get Response:"
echo $GET_RESPONSE

# Extract encrypted OTP and public key
ENCRYPTED_OTP=$(echo $GET_RESPONSE | grep -o '"encryptedOtp":"[^"]*' | grep -o '[^"]*$')
PUBLIC_KEY=$(echo $GET_RESPONSE | grep -o '"publicKey":"[^"]*' | grep -o '[^"]*$')

if [ -z "$ENCRYPTED_OTP" ] || [ -z "$PUBLIC_KEY" ]; then
    echo -e "${RED}Failed to get encrypted OTP or public key${NC}"
    exit 1
fi

echo "Encrypted OTP: $ENCRYPTED_OTP"
echo "Public Key: $PUBLIC_KEY"

# Step 3: Test decryption
echo -e "\n${GREEN}3. Testing OTP decryption${NC}"
node decrypt.js "$ENCRYPTED_OTP" "$PUBLIC_KEY" "$OTP_CERT_KEY"

# Step 4: Test with invalid credentials
echo -e "\n${GREEN}4. Testing with invalid credentials${NC}"
INVALID_RESPONSE=$(curl -s -X POST "$BASE_URL/otp/$TABLE_ID/get" \
  -H "Content-Type: application/json" \
  -d '{
    "clientSecret": "InvalidSecret123",
    "clientKey": "InvalidKey456789"
  }')

echo "Invalid Credentials Response:"
echo $INVALID_RESPONSE 