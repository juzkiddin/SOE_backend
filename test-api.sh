#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if required environment variables are set
if [ -z "$OTP_VERIFY_SECRET" ] || [ -z "$OTP_VERIFY_KEY" ]; then
    echo -e "${RED}Error: OTP_VERIFY_SECRET and OTP_VERIFY_KEY environment variables must be set${NC}"
    echo "Please set them using:"
    echo "export OTP_VERIFY_SECRET=your_verify_secret"
    echo "export OTP_VERIFY_KEY=your_verify_key"
    exit 1
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

# Step 3: Test with invalid credentials
echo -e "\n${GREEN}3. Testing with invalid credentials${NC}"
INVALID_RESPONSE=$(curl -s -X POST "$BASE_URL/otp/$TABLE_ID/get" \
  -H "Content-Type: application/json" \
  -d '{
    "clientSecret": "InvalidSecret123",
    "clientKey": "InvalidKey456789"
  }')

echo "Invalid Credentials Response:"
echo $INVALID_RESPONSE 