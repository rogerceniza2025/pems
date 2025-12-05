const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testThemeToggle() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

    // Take screenshot immediately on page load
    console.log('Taking screenshot 1: Immediately on page load');
    await page.screenshot({
      path: 'D:/pems/theme-toggle-1-initial.png',
      fullPage: true
    });

    // Wait 2 seconds and take another screenshot
    console.log('Waiting 2 seconds for CSS to apply...');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'D:/pems/theme-toggle-2-2seconds.png',
      fullPage: true
    });

    // Wait another 3 seconds (total 5 seconds) and take screenshot
    console.log('Waiting 3 more seconds (total 5 seconds)...');
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: 'D:/pems/theme-toggle-3-5seconds.png',
      fullPage: true
    });

    // Check if theme toggle button is visible
    const themeToggleSelectors = [
      '[data-testid="theme-toggle"]',
      'button[aria-label*="theme"]',
      'button[aria-label*="Theme"]',
      'button[class*="theme"]',
      'button[title*="theme"]',
      'button[title*="Theme"]',
      '.theme-toggle',
      '[class*="darkMode"]',
      '[class*="theme-switch"]'
    ];

    let toggleButton = null;
    let foundSelector = null;

    for (const selector of themeToggleSelectors) {
      try {
        toggleButton = await page.$(selector);
        if (toggleButton) {
          foundSelector = selector;
          console.log(`Found theme toggle with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    // If not found with specific selectors, look for any button with sun/moon icons
    if (!toggleButton) {
      const buttonsWithIcons = await page.$$eval('button', buttons => {
        return buttons.filter(btn => {
          const text = btn.textContent || '';
          const innerHTML = btn.innerHTML || '';
          return text.includes('☀') || text.includes('🌙') ||
                 text.includes('sun') || text.includes('moon') ||
                 innerHTML.includes('sun') || innerHTML.includes('moon') ||
                 innerHTML.includes('light') || innerHTML.includes('dark');
        });
      });

      if (buttonsWithIcons.length > 0) {
        toggleButton = buttonsWithIcons[0];
        console.log('Found theme toggle button with sun/moon icon');
      }
    }

    // Document the current state
    const observations = {
      timestamp: new Date().toISOString(),
      url: 'http://localhost:3000',
      themeToggleButtonFound: !!toggleButton,
      foundSelector: foundSelector,
      buttonVisible: toggleButton ? await toggleButton.isVisible() : false,
      buttonBoundingBox: toggleButton ? await toggleButton.boundingBox() : null,
      pageContent: {
        title: await page.title(),
        url: page.url()
      }
    };

    // Save observations
    fs.writeFileSync(
      'D:/pems/theme-toggle-observations.json',
      JSON.stringify(observations, null, 2)
    );

    console.log('\n=== OBSERVATIONS ===');
    console.log(`Theme toggle button found: ${observations.themeToggleButtonFound}`);
    console.log(`Button visible: ${observations.buttonVisible}`);
    if (observations.foundSelector) {
      console.log(`Found with selector: ${observations.foundSelector}`);
    }

    // Try to click the button if found
    if (toggleButton && await toggleButton.isVisible()) {
      console.log('\nAttempting to click the theme toggle button...');

      // Take screenshot before click
      await page.screenshot({
        path: 'D:/pems/theme-toggle-before-click.png',
        fullPage: true
      });

      await toggleButton.click();

      // Wait a moment for any animation/state change
      await page.waitForTimeout(500);

      // Take screenshot after click
      await page.screenshot({
        path: 'D:/pems/theme-toggle-after-click.png',
        fullPage: true
      });

      console.log('Clicked theme toggle button');
    } else {
      console.log('\nTheme toggle button not found or not visible - cannot test click behavior');
    }

    // Wait 10 seconds total and take final screenshot
    console.log('\nWaiting 5 more seconds (total 10 seconds) for final state...');
    await page.waitForTimeout(5000);
    await page.screenshot({
      path: 'D:/pems/theme-toggle-4-10seconds.png',
      fullPage: true
    });

    console.log('\nScreenshots saved to D:/pems/');
    console.log('- theme-toggle-1-initial.png (immediate)');
    console.log('- theme-toggle-2-2seconds.png (after 2s)');
    console.log('- theme-toggle-3-5seconds.png (after 5s)');
    console.log('- theme-toggle-4-10seconds.png (after 10s)');
    if (toggleButton && await toggleButton.isVisible()) {
      console.log('- theme-toggle-before-click.png');
      console.log('- theme-toggle-after-click.png');
    }
    console.log('- theme-toggle-observations.json (detailed observations)');

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

testThemeToggle();