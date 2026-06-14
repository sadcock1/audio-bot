'use strict';
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const COOKIES_OUT = '/cookies/cookies.txt';
const COOKIES_TMP = '/cookies/cookies.tmp';
const PROFILE_DIR = '/data/profile';
const WAIT_FOR_LOGIN = process.env.WAIT_FOR_LOGIN === '1';
const LOGIN_TIMEOUT_MS = 15 * 60 * 1000;

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

function isLoggedIn(cookies) {
  return cookies.some(c => c.name === 'SID' && c.value.length > 5);
}

function hasValidAuthCookies(cookies) {
  const required = ['SID', '__Secure-1PSID', 'SAPISID'];
  return required.some(name => cookies.some(c => c.name === name && c.value.length > 5));
}

async function main() {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(COOKIES_OUT), { recursive: true });

  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    executablePath: '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = ctx.pages()[0] ?? await ctx.newPage();
  await page.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(3000);

  let cookies = await ctx.cookies(['https://www.youtube.com', 'https://accounts.google.com']);

  if (!isLoggedIn(cookies)) {
    if (!WAIT_FOR_LOGIN) {
      console.log('[cookie-refresher] Not signed in — skipping (cron mode). For initial setup run: docker compose exec cookie-refresher env WAIT_FOR_LOGIN=1 DISPLAY=:99 node /app/refresh.js');
      await ctx.close();
      process.exit(1);
    }

    console.log('[cookie-refresher] Not signed in — open http://<VPS-TAILSCALE-IP>:6080/vnc.html and sign into YouTube (burner account). Waiting up to 15 minutes...');

    const deadline = Date.now() + LOGIN_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await page.waitForTimeout(5000);
      cookies = await ctx.cookies(['https://www.youtube.com', 'https://accounts.google.com']);
      if (isLoggedIn(cookies)) break;
    }

    if (!isLoggedIn(cookies)) {
      console.error('[cookie-refresher] Timed out waiting for sign-in (15 min). Re-run the setup command after signing in via noVNC.');
      await ctx.close();
      process.exit(1);
    }

    console.log('[cookie-refresher] Signed in! Collecting cookies...');
    await page.goto('https://www.youtube.com', { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(2000);
    cookies = await ctx.cookies(['https://www.youtube.com', 'https://accounts.google.com']);
  }

  if (!hasValidAuthCookies(cookies)) {
    console.error('[cookie-refresher] Exported cookies are missing essential auth cookies — not overwriting existing file.');
    await ctx.close();
    process.exit(1);
  }

  // Write to temp then atomically rename so a failed export never corrupts the live file
  fs.writeFileSync(COOKIES_TMP, toCookiesTxt(cookies));
  fs.renameSync(COOKIES_TMP, COOKIES_OUT);
  console.log(`[cookie-refresher] Exported ${cookies.length} cookies to ${COOKIES_OUT}`);

  await ctx.close();
}

main().catch(err => {
  console.error('[cookie-refresher]', err.message);
  process.exit(1);
});
