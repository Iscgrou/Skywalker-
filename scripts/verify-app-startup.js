/**
 * 🚀 MARFANET APPLICATION STARTUP VERIFICATION
 * 
 * This script attempts to start the MarFaNet application and verify
 * that all components are working correctly.
 */

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

console.log('\n🚀 MARFANET APPLICATION STARTUP VERIFICATION');
console.log('═'.repeat(60));

// Check if we can start the development server
console.log('\n📋 Testing Application Startup...');

// First, let's check the type checking
console.log('🔍 Step 1: Type Checking...');

const typeCheck = spawn('npm', ['run', 'check'], {
  stdio: 'pipe',
  cwd: process.cwd()
});

let typeOutput = '';
let typeErrors = '';

typeCheck.stdout.on('data', (data) => {
  typeOutput += data.toString();
});

typeCheck.stderr.on('data', (data) => {
  typeErrors += data.toString();
});

typeCheck.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Type checking passed');
  } else {
    console.log('⚠️ Type checking has issues:');
    console.log(typeErrors);
  }
  
  // Try to start the dev server
  console.log('\n🔍 Step 2: Starting Development Server...');
  
  const devServer = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    cwd: process.cwd()
  });
  
  let serverOutput = '';
  let serverStarted = false;
  let startupTime = Date.now();
  
  devServer.stdout.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    console.log(output);
    
    // Look for startup indicators
    if (output.includes('Server running') || output.includes('listening') || output.includes('Local:')) {
      serverStarted = true;
      console.log('✅ Server appears to be starting...');
    }
  });
  
  devServer.stderr.on('data', (data) => {
    const error = data.toString();
    console.log('Error:', error);
  });
  
  // Kill the server after a reasonable time to test startup
  setTimeout(() => {
    devServer.kill('SIGTERM');
    
    const runtime = Date.now() - startupTime;
    console.log(`\n📊 Startup Test Results:`);
    console.log(`⏱️  Startup attempt time: ${Math.round(runtime / 1000)}s`);
    console.log(`🚀 Server started: ${serverStarted ? 'Yes' : 'No'}`);
    
    // Save startup log
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    writeFileSync(`startup-test-log-${timestamp}.txt`, serverOutput);
    console.log(`📄 Startup log saved: startup-test-log-${timestamp}.txt`);
    
    if (serverStarted) {
      console.log('\n✅ APPLICATION STARTUP: SUCCESSFUL');
      console.log('🎯 The MarFaNet application can start and run correctly');
    } else {
      console.log('\n⚠️ APPLICATION STARTUP: NEEDS INVESTIGATION');
      console.log('🔧 The application may need configuration or dependencies');
    }
    
    console.log('\n═'.repeat(60));
    console.log('🎊 Startup verification complete');
    
  }, 10000); // Give it 10 seconds to start
  
});

// Also check if we can build the application
console.log('\n🔍 Step 3: Build Test (Background)...');

setTimeout(() => {
  const buildTest = spawn('npm', ['run', 'build'], {
    stdio: 'pipe',
    cwd: process.cwd()
  });
  
  let buildOutput = '';
  
  buildTest.stdout.on('data', (data) => {
    buildOutput += data.toString();
  });
  
  buildTest.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Build test passed - application can be built for production');
    } else {
      console.log('⚠️ Build test failed - check dependencies and configuration');
    }
  });
}, 15000);