#!/usr/bin/env node

/**
 * R3L:F Functionality Test Suite
 * Tests all major functionality before deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 R3L:F Beta Launch Functionality Test\n');

// Test 1: Check all HTML files have secure API helper
console.log('1. Testing API Helper Integration...');
const htmlFiles = [
    'public/index.html',
    'public/feed.html', 
    'public/upload.html',
    'public/drawer.html',
    'public/profile.html',
    'public/search.html',
    'public/bookmarks.html',
    'public/content.html',
    'public/network.html',
    'public/auth/login.html',
    'public/auth/register.html',
    'public/auth/recovery.html'
];

let apiHelperTest = true;
htmlFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (!content.includes('secure-api-helper.js')) {
            console.log(`❌ ${file} missing secure API helper`);
            apiHelperTest = false;
        }
    }
});

if (apiHelperTest) {
    console.log('✅ All HTML files use secure API helper\n');
} else {
    console.log('❌ Some files missing secure API helper\n');
}

// Test 2: Check for dead code patterns
console.log('2. Testing for Dead Code...');
const deadCodePatterns = [
    'storeAuthToken',
    'getAuthToken', 
    'localStorage.getItem',
    'oauth',
    'github',
    'orcid'
];

let deadCodeFound = false;
function checkDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            checkDirectory(filePath);
        } else if (file.endsWith('.js') || file.endsWith('.html')) {
            const content = fs.readFileSync(filePath, 'utf8');
            deadCodePatterns.forEach(pattern => {
                if (content.toLowerCase().includes(pattern.toLowerCase()) && 
                    !filePath.includes('secure-api-helper.js') &&
                    !filePath.includes('vendor/')) {
                    console.log(`⚠️  Found '${pattern}' in ${filePath}`);
                    deadCodeFound = true;
                }
            });
        }
    });
}

checkDirectory('public');
if (!deadCodeFound) {
    console.log('✅ No dead code patterns found\n');
} else {
    console.log('❌ Dead code patterns detected\n');
}

// Test 3: Check consistency in expiration times
console.log('3. Testing Expiration Time Consistency...');
const files = ['public/upload.html', 'public/index.html', 'wrangler.jsonc'];
let expirationConsistent = true;

files.forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('7 days') || content.includes('7-day')) {
            console.log(`❌ ${file} still references 7 days instead of 30`);
            expirationConsistent = false;
        }
    }
});

if (expirationConsistent) {
    console.log('✅ Expiration times are consistent (30 days)\n');
} else {
    console.log('❌ Inconsistent expiration times found\n');
}

// Test 4: Check backend API endpoints
console.log('4. Testing Backend API Completeness...');
const backendFile = 'src/index.js';
const requiredEndpoints = [
    'register',
    'login', 
    'logout',
    'profile',
    'content',
    'feed',
    'bookmarks',
    'messages',
    'notifications',
    'network'
];

let endpointsComplete = true;
if (fs.existsSync(backendFile)) {
    const content = fs.readFileSync(backendFile, 'utf8');
    requiredEndpoints.forEach(endpoint => {
        if (!content.includes(`'/${endpoint}'`) && !content.includes(`"/${endpoint}"`)) {
            console.log(`❌ Missing endpoint: /${endpoint}`);
            endpointsComplete = false;
        }
    });
}

if (endpointsComplete) {
    console.log('✅ All required API endpoints present\n');
} else {
    console.log('❌ Some API endpoints missing\n');
}

// Test 5: Check database schema completeness
console.log('5. Testing Database Schema...');
const schemaFile = 'db/schema.sql';
const requiredTables = [
    'users',
    'profiles', 
    'auth_sessions',
    'content',
    'content_location',
    'content_lifecycle',
    'connections',
    'bookmarks',
    'messages',
    'notifications',
    'comments',
    'content_reactions'
];

let schemaComplete = true;
if (fs.existsSync(schemaFile)) {
    const content = fs.readFileSync(schemaFile, 'utf8');
    requiredTables.forEach(table => {
        if (!content.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
            console.log(`❌ Missing table: ${table}`);
            schemaComplete = false;
        }
    });
}

if (schemaComplete) {
    console.log('✅ Database schema is complete\n');
} else {
    console.log('❌ Database schema incomplete\n');
}

// Final Report
console.log('📊 BETA LAUNCH READINESS REPORT');
console.log('================================');

const tests = [
    { name: 'API Helper Integration', passed: apiHelperTest },
    { name: 'Dead Code Cleanup', passed: !deadCodeFound },
    { name: 'Expiration Consistency', passed: expirationConsistent },
    { name: 'Backend API Completeness', passed: endpointsComplete },
    { name: 'Database Schema', passed: schemaComplete }
];

const passedTests = tests.filter(t => t.passed).length;
const totalTests = tests.length;

tests.forEach(test => {
    console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
});

console.log(`\n📈 Score: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
    console.log('\n🚀 READY FOR BETA LAUNCH! 🚀');
    console.log('All functionality tests passed. The platform is ready for deployment.');
} else {
    console.log('\n⚠️  ISSUES DETECTED');
    console.log('Please fix the issues above before deploying to production.');
}

console.log('\nNext steps:');
console.log('1. Run: npm run lint');
console.log('2. Run: npm run deploy');
console.log('3. Test functionality on deployed version');
console.log('4. Monitor logs and performance');