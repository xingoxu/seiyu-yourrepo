import * as puppeteer from 'puppeteer-core';
import { getBrowser } from './getBrowser';
import * as assert from 'assert';
import { parse } from 'date-fns';
import * as rl from 'readline';
const readline = rl.createInterface({
  input: process.stdin,
  output: process.stdout
});


let idNumPromise = ask('取引番号：');
let askTimePromise = idNumPromise.then(() => ask('時間：\nMMDD HHmm'));

async function getPage(browser: puppeteer.Browser) {
  const page = await browser.newPage();
  await page.goto('http://www.survey.seiyu.co.jp');
  setAgreeDialog(page);
  return page;
}

async function setAgreeDialog(page: puppeteer.Page) {
  page.on('dialog', dialog => {
    console.log(`${dialog.type()}: ${dialog.message()}`);
    dialog.accept();
  });
}

async function ensureElement(description: string, selector: Promise<puppeteer.ElementHandle<Element> | null>) {
  const result = await selector;
  if (!result) throw new Error(`failed finding element on: ${description}`);
  return result;
}

function wait(time: number) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time);
  });
}

async function nextStep(page: puppeteer.Page, selector = '.completeButton input') {
  await wait(300);
  return await Promise.all([
    page.waitForNavigation(),
    (await ensureElement('次へ', page.$(selector))).click()
  ]);
}

async function agree(page: puppeteer.Page) {
  // there is a navigation by js;
  try {
    await page.waitForNavigation();
  } catch (e) {

  }

  await (await ensureElement('同意する', page.$('#row_1'))).click();
  await nextStep(page);

  await (await ensureElement('今日本住んでいますか', page.$('#row_1'))).click();
  await nextStep(page);

  await (await ensureElement('従業員いますか', page.$('#row_0'))).click();
  await nextStep(page);
  return page;
}

function ask(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    readline.question(question + '\n', answer => {
      resolve(answer);
      readline.pause()
    });
  })
}

async function inputInformation(page: puppeteer.Page) {
  // あなたの年代をお答えください。
  assert.notEqual((await page.select('select#S2', '3')).length, 0);
  await nextStep(page);

  await (await ensureElement('レシート持っていますか？', page.$('#row_1'))).click();
  await nextStep(page);

  // レシート情報入力
  await (await ensureElement('店番', page.$('input[name=storeNum]'))).type('00015');

  const idNum = await idNumPromise;
  await (await ensureElement('取引番号', page.$('input[name=IDNum]'))).type(idNum);

  // ask user for time
  const time = await askTimePromise;
  const now = new Date();
  let dateTime;
  try {
    dateTime = parse(`${now.getFullYear()}-${time}`, 'yyyy-MMdd HHmm', now);
    if (now.getMonth() == 0 && dateTime.getMonth() == 11)
      dateTime.setFullYear(dateTime.getFullYear() - 1);
  } catch (e) {
    console.log(e);
    throw e;
  }

  // input date
  assert.notEqual((await page.select('select#year', dateTime.getFullYear() + '')).length, 0);
  assert.notEqual((await page.select('select#month', (dateTime.getMonth() + 1) + '')).length, 0);
  assert.notEqual((await page.select('select#day', dateTime.getDate() + '')).length, 0);

  // input time
  assert.notEqual((await page.select('select#S4b_01', Math.ceil(dateTime.getHours() / 2) + '')).length, 0);


  console.log('Input Complete');
  await nextStep(page, 'input[alt="Click Here to Continue"]');
  return page;
}

function random() {
  return Math.random() < 0.5 ? 8 : 9;
}

async function singleScoreTable(page: puppeteer.Page) {
  let questionnaireSelectors = await page.$$('img[id^=star]');
  if (questionnaireSelectors.length == 0 || questionnaireSelectors.length % 10 > 0)
    throw new Error(`Questionnaire ${page.title()}: No Questionnaire rows`);

  for (let i = 0; i < questionnaireSelectors.length; i += 10) {
    await questionnaireSelectors[i + random() - 1].click();
  }
  return page;
}

async function scoreTable(page: puppeteer.Page) {
  let questionnaireRows = await page.$$('tr');
  if (questionnaireRows.length == 0)
    return await singleScoreTable(page);

  let clickAble = (await Promise.all(
    questionnaireRows.map(async el => {
      let chkBox = await el.$('img.chkBox');
      if (chkBox)
        return chkBox;
      else {
        let scoreSelectors = (await el.$$('img'));
        if (scoreSelectors.length > 0)
          return scoreSelectors[random() - 1];
      }
      return null;
    })
  ));

  await clickAble.map(async val => {
    if (val)
      return await val.click();
  });
  return page;
}

async function score(page: puppeteer.Page) {
  console.log('全体感覚');
  await (await ensureElement('全体感覚', page.$(`#star1_${random()}`))).click();
  await nextStep(page);

  await scoreTable(page);
  await nextStep(page);

  console.log('選択 その他の食品');
  await (await ((await ensureElement('その他の食品', page.$('#A3_5_5'))).$x('..')))[0].click();
  await nextStep(page);

  console.log('score1');
  await scoreTable(page);
  await nextStep(page);

  // input Form
  console.log('input 1');
  await nextStep(page);

  console.log('score 2');
  await scoreTable(page);
  await nextStep(page);

  // input Form
  console.log('input 2');
  await nextStep(page);
  // input Form
  console.log('input 3');
  try {
    await scoreTable(page);
  } catch (e) {
  }
  await nextStep(page);
  // input Form
  console.log('input 4');
  await nextStep(page);

  console.log('score 3');
  try {
    await scoreTable(page);
  } catch (e) {
    // await wait(1000 * 60);
    await nextStep(page);
    await nextStep(page);
    await scoreTable(page);
  }
  await nextStep(page);

  console.log('徒歩');
  await (await ensureElement('徒歩', page.$('#row_1_img'))).click();
  await nextStep(page);

  console.log('男性');
  await (await ensureElement('男性', page.$('#row_1_img'))).click();
  await nextStep(page);

  console.log('一人暮らし');
  await (await ensureElement('一人暮らし', page.$('#row_1_img'))).click();
  await nextStep(page);

  console.log('会社員');
  await (await ensureElement('会社員', page.$('#row_13_img'))).click();
  await nextStep(page);

  return page;
}

async function getQRUrl(page: puppeteer.Page): Promise<string> {
  return (await ensureElement('クーポン受け取り', page.$('.Z1intcontinueButton a'))).getProperty('href').then(x => x.jsonValue());
}

import * as qrcode from 'qrcode-terminal';

function showQR(url: string) {
  qrcode.generate(url, { small: true });
}


getBrowser.then(getPage).then(agree).then(inputInformation).then(score).then(getQRUrl).then(url => {
  console.log(url);
  return showQR(url);
}).then(async () => {
  const browser = await getBrowser;
  await browser.close();
  readline.close();
}).catch(e => {
  console.log(e);
  process.exit(9);
});