#!/bin/bash
# Bulk create users using Supabase Auth API
# Usage: ./create-users.sh

# Set your values here
SUPABASE_URL="YOUR_SUPABASE_URL"
SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"

echo "🚀 Creating test users..."

for i in {1..10}; do
  echo "Creating testuser$i@example.com"
  
  curl -X POST "$SUPABASE_URL/auth/v1/admin/users" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "testuser'$i'@example.com",
      "password": "password123",
      "email_confirm": true
    }'
  
  echo "✅ User $i created"
done

echo "🎉 All users created! Now run the SQL script to create profiles and assign to cohorts." 