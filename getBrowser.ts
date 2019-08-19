import * as puppeteer from 'puppeteer-core';


async function createBrowser() {
  return await puppeteer.launch({
    defaultViewport: {
      width: 1389,
      height: 888,
    },
    args: [
      '--remote-debugging-port=9222',
      // '--no-sandbox',
      // '--disable-setuid-sandbox',
    ],
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    // devtools: true,
    // slowMo: 250 // slow down by 250ms
  });
}

export const getBrowser = createBrowser();

