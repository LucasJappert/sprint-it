#!/usr/bin/env node

/**
 * Configuration Validation Script
 *
 * Validates that all required environment variables are properly configured
 * before running the application.
 */

const fs = require('fs');
const path = require('path');

const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
];

const placeholderValues = [
    'your_api_key_here',
    'your-project.firebaseapp.com',
    'your-project-id',
    'your-project-id.firebasestorage.app',
    'your_sender_id',
    'your_app_id'
];

function validateEnvironment() {
    console.log('🔍 Validating environment configuration...\n');

    let hasErrors = false;
    const errors = [];

    // Check if .env file exists
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
        errors.push('❌ .env file not found. Please copy .env.example to .env and configure your Firebase credentials.');
        hasErrors = true;
    } else {
        console.log('✅ .env file found');

        // Read and validate .env content
        const envContent = fs.readFileSync(envPath, 'utf8');
        const missingVars = [];

        requiredEnvVars.forEach((varName, index) => {
            if (!envContent.includes(varName + '=')) {
                missingVars.push(varName);
            } else {
                // Check if it's still using placeholder values
                const placeholderValue = placeholderValues[index];
                if (envContent.includes(varName + '=' + placeholderValue)) {
                    errors.push(`❌ ${varName} is still using placeholder value. Please configure your actual Firebase credentials.`);
                    hasErrors = true;
                } else {
                    console.log(`✅ ${varName} is configured`);
                }
            }
        });

        if (missingVars.length > 0) {
            errors.push(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
            hasErrors = true;
        }
    }

    // Check for sensitive files
    const sensitiveFiles = [
        'config.json',
        '.env.local',
        '.env.production'
    ];

    sensitiveFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', file);
        if (fs.existsSync(filePath)) {
            console.log(`⚠️  Sensitive file found: ${file} (make sure it's in .gitignore)`);
        }
    });

    // Final result
    if (!hasErrors && fs.existsSync(envPath)) {
        console.log('\n🎉 Configuration validation passed!');
        console.log('🚀 You can now run: npm run dev');
        return true;
    } else {
        console.log('\n❌ Configuration validation failed:');
        errors.forEach(error => console.log(error));
        console.log('\n📖 Please check the README.md for setup instructions.');
        return false;
    }
}

// Run validation if this script is executed directly
if (require.main === module) {
    const isValid = validateEnvironment();
    process.exit(isValid ? 0 : 1);
}

module.exports = { validateEnvironment };
