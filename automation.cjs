// automation.cjs - UPDATED VERSION
const fs = require('fs');
const { chromium } = require('playwright');

console.log('🚀 Starting CAO Automation...');

// Read data
let data;
try {
    const rawData = fs.readFileSync('cao-application-data.json', 'utf8');
    data = JSON.parse(rawData);
    console.log('✅ Data loaded successfully!');
} catch (error) {
    console.error('❌ Error loading data:', error.message);
    process.exit(1);
}

console.log(`👤 Applicant: ${data.personalInfo.firstName} ${data.personalInfo.lastName}`);
console.log(`📚 ${data.courseChoices.length} course choices`);

async function testBrowser() {
    console.log('\n🌐 Testing browser connection...');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 100
    });
    
    const page = await browser.newPage();
    
    try {
        // Test with Google first
        console.log('📡 Testing connection to Google...');
        await page.goto('https://www.google.com', { timeout: 10000 });
        console.log('✅ Google loaded successfully!');
        
        // Search for CAO to test
        await page.fill('textarea[name="q"], input[name="q"]', 'CAO South Africa apply');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        
        console.log('✅ Browser is working!');
        
        // Now try CAO with longer timeout
        console.log('\n📡 Now trying CAO website...');
        await page.goto('https://cao.ac.za/', { 
            timeout: 60000, // 60 seconds
            waitUntil: 'domcontentloaded' // Less strict than 'load'
        });
        
        console.log('✅ CAO website loaded!');
        await page.screenshot({ path: 'cao-website.png' });
        console.log('📸 Screenshot saved: cao-website.png');
        
        // Show what's on the page
        const title = await page.title();
        console.log(`📄 Page title: "${title}"`);
        
        // Find any links with "apply" or "application"
        const links = await page.$$eval('a', links => 
            links
                .filter(link => link.textContent.toLowerCase().includes('apply') || 
                               link.href.toLowerCase().includes('apply'))
                .map(link => ({ text: link.textContent, href: link.href }))
        );
        
        if (links.length > 0) {
            console.log('\n🔗 Found application links:');
            links.forEach(link => {
                console.log(`   • ${link.text} -> ${link.href}`);
            });
        } else {
            console.log('\n🔍 No apply links found automatically');
            console.log('   Please inspect the page manually');
        }
        
        // Keep browser open
        console.log('\n⏳ Keeping browser open for manual inspection...');
        console.log('1. Look for application/apply links');
        console.log('2. Right-click on form fields → Inspect');
        console.log('3. Note the field names/IDs');
        console.log('4. Close browser when done');
        
        await page.waitForTimeout(30000); // 30 seconds
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        // Try alternative CAO URLs
        console.log('\n🔧 Trying alternative CAO URLs...');
        const alternativeURLs = [
            'http://cao.ac.za/',
            'https://www.cao.ac.za/',
            'https://apply.cao.ac.za/',
            'https://applications.cao.ac.za/'
        ];
        
        for (const url of alternativeURLs) {
            try {
                console.log(`   Trying ${url}...`);
                await page.goto(url, { timeout: 10000 });
                console.log(`   ✅ Success with ${url}`);
                await page.screenshot({ path: `cao-alternative-${Date.now()}.png` });
                break;
            } catch (e) {
                console.log(`   ❌ Failed: ${e.message}`);
            }
        }
    } finally {
        await browser.close();
        console.log('👋 Browser closed');
    }
}

// Run the automation
testBrowser().catch(console.error);