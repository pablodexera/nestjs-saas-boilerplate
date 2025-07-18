#!/bin/bash

# Test Runner for Updated E2E Tests
# This script runs the E2E tests that have been updated with the new testing strategy

set -e

echo "🧪 Running Updated E2E Tests"
echo "============================"

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

# Check if .env.test exists
if [ ! -f ".env.test" ]; then
    echo "❌ Error: .env.test file not found"
    exit 1
fi

# Source the test environment
source .env.test

# Verify required environment variables
if [ -z "$CLERK_SECRET_KEY" ] || [ -z "$SEED_ADMIN_EMAIL" ] || [ -z "$SEED_WORKSPACE_ADMIN_EMAIL" ] || [ -z "$SEED_USER_EMAIL" ] || [ -z "$SEED_WORKSPACE_ID" ]; then
    echo "❌ Error: Required environment variables not set"
    exit 1
fi

echo "✅ Environment verified"

# Run the updated E2E tests
echo ""
echo "🚀 Running E2E tests..."

# Run all test files that have been updated with the new testing strategy
npm run test:e2e -- --testPathPatterns="user-workspaces.e2e-spec.ts|workspaces.e2e-spec.ts|users.e2e-spec.ts|subscriptions.e2e-spec.ts|notifications.e2e-spec.ts|guest-tokens.e2e-spec.ts|audit-events.e2e-spec.ts|files.e2e-spec.ts"

echo ""
echo "✅ E2E tests completed!" 