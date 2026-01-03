const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to login page...');
  await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle', timeout: 30000 });

  console.log('Current URL:', page.url());
  console.log('\n=== Page Title ===');
  console.log(await page.title());

  console.log('\n=== Looking for form elements ===');

  // Check for email inputs
  const emailInputs = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[id*="email" i]').all();
  console.log(`Found ${emailInputs.length} email input(s)`);
  for (let i = 0; i < emailInputs.length; i++) {
    const attrs = await emailInputs[i].evaluate(el => ({
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      id: el.getAttribute('id'),
      placeholder: el.getAttribute('placeholder'),
      class: el.getAttribute('class')
    }));
    console.log(`  Email input ${i+1}:`, JSON.stringify(attrs));
  }

  // Check for password inputs
  const passwordInputs = await page.locator('input[type="password"]').all();
  console.log(`\nFound ${passwordInputs.length} password input(s)`);
  for (let i = 0; i < passwordInputs.length; i++) {
    const attrs = await passwordInputs[i].evaluate(el => ({
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      id: el.getAttribute('id'),
      placeholder: el.getAttribute('placeholder'),
      class: el.getAttribute('class')
    }));
    console.log(`  Password input ${i+1}:`, JSON.stringify(attrs));
  }

  // Check for buttons
  const buttons = await page.locator('button, input[type="submit"]').all();
  console.log(`\nFound ${buttons.length} button(s)`);
  for (let i = 0; i < buttons.length; i++) {
    const info = await buttons[i].evaluate(el => ({
      type: el.getAttribute('type'),
      text: el.textContent,
      class: el.getAttribute('class')
    }));
    console.log(`  Button ${i+1}:`, JSON.stringify(info));
  }

  // Check for forms
  const forms = await page.locator('form').all();
  console.log(`\nFound ${forms.length} form(s)`);

  // Take screenshot
  await page.screenshot({ path: '/tmp/login-page-debug.png', fullPage: true });
  console.log('\nScreenshot saved to /tmp/login-page-debug.png');

  // Get body HTML
  console.log('\n=== Page body HTML (first 2000 chars) ===');
  const bodyHTML = await page.locator('body').innerHTML();
  console.log(bodyHTML.substring(0, 2000));

  await browser.close();
  console.log('\nDone!');
})();
