#!/bin/bash
# Build .mcpb (MCP Bundle) for Claude Desktop
set -euo pipefail

VERSION=$(node -p "require('./package.json').version")
BUNDLE_NAME="mcp-swiss-${VERSION}.mcpb"
BUNDLE_DIR="$(mktemp -d)"

echo "Building mcpb bundle v${VERSION}..."

# Build the project first
npm run build

# Copy required files to bundle directory
cp -r dist/ "${BUNDLE_DIR}/dist/"
cp -r node_modules/ "${BUNDLE_DIR}/node_modules/"
cp package.json "${BUNDLE_DIR}/"
cp manifest.json "${BUNDLE_DIR}/"

# Copy icon if it exists
if [ -d "assets" ]; then
  cp -r assets/ "${BUNDLE_DIR}/assets/"
fi

# Create the .mcpb (zip) file
cd "${BUNDLE_DIR}"
zip -r "/tmp/${BUNDLE_NAME}" . -x "*.git*" "*.DS_Store"
cd -

# Move to project root
mv "/tmp/${BUNDLE_NAME}" "./${BUNDLE_NAME}"

# Cleanup
rm -rf "${BUNDLE_DIR}"

echo "✅ Created ${BUNDLE_NAME} ($(du -h "${BUNDLE_NAME}" | cut -f1))"
echo "   Install: Open with Claude Desktop"
