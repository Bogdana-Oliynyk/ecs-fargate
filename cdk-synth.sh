#!/bin/bash

# This script runs the commands for the build step
# that produces the CDK Cloud Assembly

echo "Installing initial dependencies..."
npm install

echo "Installing all dependencies..."
find . -name "package.json" -not -path "**/node_modules/*" -execdir npm install \;

echo "Building CDK application..."
find . -name "package.json" -not -path "**/node_modules/*" -execdir npm run build \;

echo "Synthesizing the CDK Application..."
npx cdk synth