const path=require('path');const fs=require('fs');const assert=require('assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH || path.join(process.env.TEMP,'invisible-orchestra-qa/node_modules/playwright'));
let server;
(async()=>{
 server=require('child_process').spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
 await new Promise((resolve,reject)=>{server.stdout.on('data',data=>{if(data.toString().includes('Local:'))resolve();});server.on('error',reject);});
 const output=path.join(process.env.TEMP,'invisible-orchestra-qa');fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__sources=0;window.__closed=0;window.__streams=[];window.__deny=false;
  const Original=window.AudioContext;
  window.AudioContext=class extends Original {
   createBufferSource(){const s=super.createBufferSource();const start=s.start.bind(s);s.start=(...args)=>{window.__sources++;return start(...args);};return s;}
   close(){window.__closed++;return super.close();}
  };
  navigator.mediaDevices.getUserMedia=async()=>{
   if(window.__deny)throw new DOMException('Permission denied','NotAllowedError');
   if(window.__defer) await new Promise(resolve=>window.__release=resolve);
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;canvas.getContext('2d').fillRect(0,0,640,480);
   const stream=canvas.captureStream(15);window.__streams.push(stream);return stream;
  };
 });
 await page.goto('http://127.0.0.1:5173');await page.getByRole('heading',{name:'Make music with your hands.',exact:true}).waitFor();
 await page.screenshot({path:path.join(output,'showcase-welcome.png'),fullPage:true});
 assert.equal(await page.evaluate(()=>window.__sources),0);
 await page.locator('#languageToggle').click();assert.match(await page.locator('#pageTitle').innerText(),/Faites/);await page.locator('#languageToggle').click();
 await page.locator('#fallbackButton').click();await page.locator('#loadingPanel').waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>window.__sources),0);
 const box=await page.locator('#stage').boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.waitForTimeout(150);
 assert.ok(await page.evaluate(()=>window.__sources)>0);await page.screenshot({path:path.join(output,'showcase-playing.png'),fullPage:true});
 await page.locator('#stopButton').click();await page.locator('#welcomePanel').waitFor({state:'visible'});assert.ok(await page.evaluate(()=>window.__closed)>0);
 await page.evaluate(()=>window.__deny=true);await page.locator('#startButton').click();await page.locator('#errorPanel').waitFor({state:'visible',timeout:60000});assert.match(await page.locator('#errorMessage').innerText(),/Camera blocked/);
 await page.locator('#errorFallbackButton').click();await page.locator('#loadingPanel').waitFor({state:'hidden'});await page.locator('#stopButton').click();await page.locator('#welcomePanel').waitFor({state:'visible'});
 await page.evaluate(()=>window.__deny=false);await page.locator('#startButton').click();await page.locator('#loadingPanel').waitFor({state:'hidden',timeout:60000});await page.locator('.hand-placement').waitFor({state:'visible'});
 await page.locator('#stopButton').click();await page.locator('#welcomePanel').waitFor({state:'visible'});
 assert.ok(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
 await page.evaluate(()=>window.__defer=true);await page.locator('#startButton').click();await page.waitForFunction(()=>!!window.__release,{timeout:60000});
 await page.locator('#stopButton').click();await page.locator('#welcomePanel').waitFor({state:'visible'});await page.evaluate(()=>{window.__defer=false;window.__release();});await page.waitForTimeout(250);
 assert.ok(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));assert.equal(await page.locator('#welcomePanel').isVisible(),true);
 await page.locator('.topbar-actions button[data-i18n="fullscreen"]').click();assert.ok(await page.evaluate(()=>!!document.fullscreenElement));await page.locator('.topbar-actions button[data-i18n="exitFullscreen"]').click();
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.demo-hand').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.clock.install();await page.locator('.play-settings > summary').click();await page.locator('#idleDelay').fill('15');await page.locator('#idleDelay').dispatchEvent('change');
 await page.locator('#fallbackButton').click();await page.locator('#loadingPanel').waitFor({state:'hidden'});
 await page.clock.fastForward(15100);await page.locator('.session-prompt').waitFor({state:'visible'});
 await page.mouse.move(box.x+box.width*.4,box.y+box.height*.4);await page.clock.runFor(100);assert.equal(await page.locator('.session-prompt').isVisible(),false);
 await page.mouse.move(1,1);await page.clock.fastForward(31000);await page.locator('#welcomePanel').waitFor({state:'visible'});assert.equal(await page.locator('#cameraVideo').evaluate(v=>v.srcObject),null);
 const starts=await page.evaluate(()=>window.__sources);await page.clock.fastForward(60000);assert.equal(await page.evaluate(()=>window.__sources),starts);
 await page.locator('.play-settings > summary').click();await page.locator('#turnLimit').selectOption('120');await page.locator('#idleDelay').fill('600');await page.locator('#idleDelay').dispatchEvent('change');
 await page.locator('#fallbackButton').click();await page.locator('#loadingPanel').waitFor({state:'hidden'});
 await page.clock.fastForward(105100);await page.locator('.session-prompt').waitFor({state:'visible'});
 assert.match(await page.locator('.session-prompt').innerText(),/nearly over/);
 await page.mouse.move(box.x+box.width*.6,box.y+box.height*.5);await page.clock.runFor(100);assert.equal(await page.locator('.session-prompt').isVisible(),true);
 await page.clock.fastForward(16000);await page.locator('#welcomePanel').waitFor({state:'visible'});
 await page.setViewportSize({width:700,height:950});await page.screenshot({path:path.join(output,'showcase-narrow.png'),fullPage:true});
 assert.deepEqual(errors,[]);console.log('Browser checks passed: welcome, language, silent start, mouse audio, finish, denied camera, fallback, placement, track release, pending-permission cancellation, full screen, reduced motion, inactivity warning/resume/reset, no auto-restart.');
 await browser.close();server.kill();
})().catch(e=>{console.error(e);server?.kill();process.exit(1);});
