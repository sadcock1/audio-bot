'use strict';
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const COOKIES_OUT = '/cookies/cookies.txt';
const PROFILE_DIR = '/data/profile';

function toCookiesTxt(cookies) {
  const lines = [
    '# Netscape HTTP Cookie File',
    '# This is a generated file! Do not edit.',
    '',
  ];
  for (const c of cookies) {
    const subdomain = c.domain.startsWith('.') ? 'TRUE' : 'FALSE';
    const secure = c.secure ? 'TRUE' : 'FALSE';
    const expires = c.expires > 0 ? String(Math.floor(c.expires)) : '0';
    lines.push([c.domain, subdomain, c.path, secure, expires, c.name, c.value].join('\t'));
  }
  return lines.join('\n') + '\n';
}

async function main() {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(COOKIES_OUT), { recursive: true });

  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = ctx.pages()[0] ?? await ctx.newPage();
  await page.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(3000);

  // Check for Google session cookie — present only when signed in
  let cookies = await ctx.cookies(['https://www.youtube.com', 'https://accounts.google.com']);
  const loggedIn = cookies.some(c => c.name === 'SID' && c.value.length > 5);

  if (!loggedIn) {
    console.log('[cookie-refresher] Not signed in — open http://<VPS-TAILSCALE-IP>:6080/vnc.html in your browser and sign into YouTube');

    // Poll every 5 seconds until sign-in cookies appear
    while (true) {
      await page.waitForTimeout(5000);
      cookies = await ctx.cookies(['https://www.youtube.com', 'https://accounts.google.com']);
      if (cookies.some(c => c.name === 'SID' && c.value.length > 5)) break;
    }

    console.log('[cookie-refresher] Signed in! Collecting cookies...');
    await page.goto('https://www.youtube.com', { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(2000);
    cookies = await ctx.cookies(['https://www.youtube.com', 'https://accounts.google.com']);
  }

  fs.writeFileSync(COOKIES_OUT, toCookiesTxt(cookies));
  console.log(`[cookie-refresher] Exported ${cookies.length} cookies`);

  await ctx.close();
}

main().catch(err => {
  console.error('[cookie-refresher]', err.message);
  process.exit(1);
});
