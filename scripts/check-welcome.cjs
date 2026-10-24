const path=require('path'),fs=require('fs'),assert=require('assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||path.join(process.env.TEMP,'invisible-orchestra-qa/node_modules/playwright'));
let server,browser;
(async()=>{
 server=require('child_process').spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(d.toString().includes('Local:'))resolve();});server.on('error',reject);server.on('exit',c=>{if(c)reject(new Error('Server failed'));});});
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__cameraCalls=0;window.__audioCalls=0;const Audio=window.AudioContext;window.AudioContext=class extends Audio{constructor(...a){super(...a);window.__audioCalls++;}};if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=async()=>{window.__cameraCalls++;throw new Error('Welcome must not access camera');};});
 const output=path.join(process.env.TEMP,'invisible-orchestra-qa');fs.mkdirSync(output,{recursive:true});
 for(const [w,h] of [[1366,768],[1920,1080],[3840,2160],[2160,3840],[390,844]]){
  await page.setViewportSize({width:w,height:h});await page.goto('http://127.0.0.1:5173');await page.locator('#pageTitle').waitFor();await page.waitForTimeout(100);
  assert.equal(await page.locator('#handMode').inputValue(),'two');assert.ok(await page.locator('.demo-left-hand').isVisible());
 assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('.privacy-note').count(),1);assert.ok(await page.locator('.privacy-note').isVisible());assert.equal(await page.locator('.welcome-support').innerText(),'No musical experience needed');assert.equal(await page.getByText('Your hands. Your orchestra.',{exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>window.__cameraCalls+window.__audioCalls),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  for(const selector of ['#startButton','#fallbackButton','.demo-captions']){
   const rect=await page.locator(selector).boundingBox();assert.ok(rect && rect.width>0);
   if(w>=1366) assert.ok(rect.y+rect.height<=h,`${selector} outside ${w}x${h}`);
  }
  await page.locator('.demo-hand, .demo-trail path').evaluateAll(elements=>elements.forEach(e=>e.getAnimations().forEach(a=>{a.currentTime=2000;a.pause();})));
  assert.deepEqual(await page.locator('.demo-zones b').allTextContents(),['C','D','E','G','A','C','D','E','G','A','C']);
  await page.screenshot({path:path.join(output,`welcome-redesign-${w}x${h}.png`),fullPage:true});
  await page.locator('#languageToggle').click();assert.match(await page.locator('#pageTitle').innerText(),/Faites/);
  assert.deepEqual((await page.locator('.demo-zones b').allTextContents()).slice(0,5),['Do','R\u00e9','Mi','Sol','La']);
  assert.equal(await page.locator('[data-i18n=demoQuiet]').innerText(),'Doux');
  const button=await page.locator('#startButton').boundingBox();if(w>=1366)assert.ok(button.y+button.height<=h,'French start clipped');
  await page.screenshot({path:path.join(output,`welcome-redesign-fr-${w}x${h}.png`),fullPage:true});
 }
 await page.setViewportSize({width:1366,height:768});await page.goto('http://127.0.0.1:5173');
 const first=await page.locator('.demo-hand').evaluate(e=>[e.style.left,e.style.top]);await page.waitForTimeout(300);const moved=await page.locator('.demo-hand').evaluate(e=>[e.style.left,e.style.top]);assert.notDeepEqual(first,moved);
 const demoState=await page.locator('.control-demo').evaluate(e=>({note:+e.dataset.note,active:[...e.querySelectorAll('.demo-zones > span')].findIndex(z=>z.classList.contains('is-active')),volume:parseFloat(e.querySelector('.demo-volume-fill').style.height),y:parseFloat(e.querySelector('.demo-left-hand').style.top)}));assert.equal(demoState.note,demoState.active);assert.ok(Math.abs(demoState.volume-(100-demoState.y))<.01);
 await page.locator('.play-settings > summary').click();await page.locator('#octaveToggle').check();assert.equal(await page.locator('.demo-zones b').first().innerText(),'C4');await page.locator('#octaveToggle').uncheck();
 await page.locator('#holdDuration').waitFor({state:'visible'});
 const settings=await page.locator('.settings-content').boundingBox();assert.ok(settings.x>=0 && settings.x+settings.width<=1366 && settings.y+settings.height<=768);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#holdDuration').isVisible(),false);
 await page.locator('.display-settings > summary').click();await page.locator('.output-settings > summary').click();await page.locator('#outputPreset').scrollIntoViewIfNeeded();assert.ok(await page.locator('#outputPreset').isVisible());assert.equal(await page.locator('#openPresentation').count(),0);
 await page.keyboard.press('Escape');
 await page.evaluate(()=>document.documentElement.style.zoom='2');
 await page.locator('#startButton').scrollIntoViewIfNeeded();assert.ok(await page.locator('#startButton').isVisible());
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:path.join(output,'welcome-redesign-zoom200.png'),fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.demo-hand').evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.waitForTimeout(100);const still=await page.locator('.demo-hand').evaluate(e=>[e.style.left,e.style.top]);await page.waitForTimeout(100);assert.deepEqual(await page.locator('.demo-hand').evaluate(e=>[e.style.left,e.style.top]),still);
 assert.deepEqual(errors,[]);console.log('Welcome checks passed: laptop/UHD portrait/landscape, narrow screen, English/French, silent demo, no horizontal overflow, visible actions, header menus, 200% zoom, reduced motion.');
 await browser.close();server.kill();
})().catch(async e=>{console.error(e);await browser?.close();server?.kill();process.exitCode=1;});
