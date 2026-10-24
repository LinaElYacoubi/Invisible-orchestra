const path=require('path');const assert=require('assert/strict');const fs=require('fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||path.join(process.env.TEMP,'invisible-orchestra-qa/node_modules/playwright'));
let server,browser;
(async()=>{
 server=require('child_process').spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(d.toString().includes('Local:'))resolve();});server.on('error',reject);server.on('exit',code=>{if(code)reject(new Error('Server failed'));});});
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const errors=[];
 await context.addInitScript(()=>{
  window.__audioContexts=0;window.__cameraCalls=0;
  const Original=window.AudioContext;window.AudioContext=class extends Original{constructor(...args){super(...args);window.__audioContexts++;}};
  if(navigator.mediaDevices) navigator.mediaDevices.getUserMedia=async()=>{window.__cameraCalls++;const c=document.createElement('canvas');c.width=640;c.height=480;c.getContext('2d').fillRect(0,0,640,480);const stream=c.captureStream(15);window.__stream=stream;return stream;};
 });
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 const page=await context.newPage();await page.goto('http://127.0.0.1:5173');

 assert.equal(await page.locator('#openPresentation').count(),0);
 await page.locator('#startButton').click();await page.locator('#loadingPanel').waitFor({state:'hidden',timeout:60000});assert.ok(await page.locator('#cameraVideo').isVisible());
 await page.locator('.display-settings > summary').click();await page.locator('#displayMode').selectOption('hologram');
 assert.ok(await page.locator('#cameraVideo').isVisible());assert.ok(await page.locator('#instrumentChoice').isVisible());assert.ok(await page.locator('#playMode').isVisible());
 await page.waitForTimeout(150);
 assert.deepEqual(await page.locator('#visualCanvas').evaluate(c=>[c.width,c.height]),[3840,2160]);
 await page.locator('.display-settings > summary').click();await page.locator('.output-settings summary').click();await page.locator('#outputPreset').selectOption('portrait');await page.waitForTimeout(150);
 assert.deepEqual(await page.locator('#visualCanvas').evaluate(c=>[c.width,c.height]),[2160,3840]);
 await page.locator('#languageToggle').click();await page.waitForTimeout(150);assert.equal(await page.locator('html').getAttribute('lang'),'fr');
 assert.equal(await page.evaluate(()=>window.__audioContexts),1);assert.equal(await page.evaluate(()=>window.__cameraCalls),1);assert.equal(context.pages().length,1);
 await page.locator('#stopButton').click();await page.locator('#welcomePanel').waitFor({state:'visible'});
 assert.ok(await page.evaluate(()=>window.__stream.getTracks().every(track=>track.readyState==='ended')));
 assert.deepEqual(errors,[]);console.log('Display checks passed: identical camera preview and controls in both modes, UHD canvas presets, language, one camera/audio instance and Finish cleanup.');
 await browser.close();server.kill();
})().catch(async e=>{console.error(e);await browser?.close();server?.kill();process.exitCode=1;});
