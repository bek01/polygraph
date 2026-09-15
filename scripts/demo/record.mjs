import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = 'http://localhost:3700';
const W = 1280, H = 720;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: 'vid', size: { width: W, height: H } },
  deviceScaleFactor: 1,
});
const p = await ctx.newPage();

const t0 = Date.now();
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.verdict', { timeout: 150000 });
await p.waitForTimeout(2500);           // let charts settle
const offset = (Date.now() - t0) / 1000; // seconds of loading to trim
console.log('TRIM_OFFSET=' + offset.toFixed(2));

// smooth scroll helper: target scrollY over a duration
async function glide(toY, ms) {
  await p.evaluate(async ([toY, ms]) => {
    const from = window.scrollY;
    const dist = toY - from;
    const start = performance.now();
    await new Promise(res => {
      function step(now) {
        const t = Math.min(1, (now - start) / ms);
        // easeInOutCubic
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        window.scrollTo(0, from + dist * e);
        if (t < 1) requestAnimationFrame(step); else res();
      }
      requestAnimationFrame(step);
    });
  }, [toY, ms]);
}

const y = async sel => p.evaluate(s => {
  const el = document.querySelector(s);
  return el ? window.scrollY + el.getBoundingClientRect().top - 70 : 0;
}, sel);

// ---- choreography (target ~56s) ----
await sleep(7000);                                  // 0-7   headline

const readoutY = await y('section.panel:nth-of-type(2)');
await glide(readoutY, 2600);                        // 7-9.6 scroll to readout
await sleep(11000);                                 // 9.6-20.6 hold on the needles

// tab tour
const tabs = await p.$$('.switcher button');
if (tabs[1]) { await tabs[1].click(); await sleep(3200); }   // 20.6-23.8 BTC
if (tabs[2]) { await tabs[2].click(); await sleep(3200); }   // 23.8-27   ETH
if (tabs[0]) { await tabs[0].click(); await sleep(4200); }   // 27-31.2   back to SOL

await sleep(3500);                                  // 31.2-34.7 hold

const calY = await p.evaluate(() => {
  const heads = [...document.querySelectorAll('.panel-head h2')];
  const h = heads.find(x => /crowd ever right/i.test(x.textContent));
  return h ? window.scrollY + h.getBoundingClientRect().top - 70 : document.body.scrollHeight;
});
await glide(calY, 3000);                            // 34.7-37.7 to calibration
await sleep(11000);                                 // 37.7-48.7 hold on the curve

await glide(readoutY, 2800);                        // 48.7-51.5 back to readout
await sleep(5000);                                  // 51.5-56.5 close

await ctx.close();
await b.close();

const f = fs.readdirSync('vid').find(n => n.endsWith('.webm'));
console.log('VIDEO=vid/' + f);
