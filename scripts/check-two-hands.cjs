const path=require('path'),assert=require('assert/strict'),fs=require('fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||path.join(process.env.TEMP,'invisible-orchestra-qa/node_modules/playwright'));
let browser,server;
(async()=>{
 server=require('child_process').spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(d.toString().includes('Local:'))resolve();});server.on('error',reject);server.on('exit',code=>{if(code)reject(new Error('Server failed'));});});
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/main.js',async route=>{
  const response=await route.fetch();let source=await response.text();source=source.replace('HandLandmarker.createFromOptions(', 'window.__createTracker(');await route.fulfill({response,body:source});
 });
 await page.addInitScript(()=>{
  window.__sourceStarts=0;window.__frames={landmarks:[],handedness:[]};window.__cameraCalls=0;window.__contexts=[];window.__gains=[];window.__filters=[];
  const Original=window.AudioContext;
  window.AudioContext=class extends Original{
   constructor(...args){super(...args);window.__contexts.push(this);}
   createBufferSource(){const source=super.createBufferSource();const start=source.start.bind(source);source.start=(...args)=>{window.__sourceStarts++;return start(...args);};return source;}
   createGain(){const gain=super.createGain();window.__gains.push(gain);return gain;}
   createBiquadFilter(){const filter=super.createBiquadFilter();window.__filters.push(filter);return filter;}
  };
  window.__createTracker=async(vision,options)=>{window.__trackerOptions=options;return{detectForVideo:()=>window.__frames,setOptions:async o=>{window.__trackerOptions={...window.__trackerOptions,...o};},close(){window.__trackerClosed=true;}};};
  navigator.mediaDevices.getUserMedia=async()=>{
   window.__cameraCalls++;const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const c=canvas.getContext('2d');c.fillRect(0,0,640,480);window.__paint=setInterval(()=>c.fillRect(0,0,640,480),50);
   const stream=canvas.captureStream(15);window.__stream=stream;return stream;
  };
 });
 const result=(hands)=>({landmarks:hands.map(([side,x,y,pinch])=>{
  const l=Array.from({length:21},()=>({x,y}));l[5]={x:x-.05,y};l[17]={x:x+.05,y};l[9]={x,y:y-.1};l[4]={x,y:y-.12};l[8]={x:x+pinch*.1,y:y-.12};return l;
 }),handedness:hands.map(([side])=>[{categoryName:side,score:.99}])});
 const frames=async hands=>page.evaluate(data=>window.__frames=data,result(hands));

 await page.goto('http://127.0.0.1:5173');await page.locator('.play-settings > summary').click();assert.equal(await page.locator('#handMode').inputValue(),'two');await page.locator('#handMode').selectOption('two');assert.ok(await page.locator('.hand-role-guide').isVisible());assert.equal(await page.locator('#melodyHand').count(),0);
 await page.locator('#startButton').click();await page.locator('#loadingPanel').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>window.__trackerOptions.numHands),2);await page.locator('#instrumentChoice').selectOption('saxophone');
 await frames([['Right',.25,.5,.1]]);await page.waitForFunction(()=>document.querySelector('#effectsRoleStatus').textContent==='Show your left hand for volume');assert.equal(await page.evaluate(()=>window.__sourceStarts),0);
 await frames([['Right',.25,.5,.1],['Left',.75,.2,.1]]);
 await page.waitForFunction(()=>document.querySelector('#melodyRoleStatus').textContent.includes('detected') && +document.querySelector('#twoHandVolume').value>.6);await page.waitForTimeout(200);
 const baseNote=await page.locator('#panelNote').innerText(),baseVolume=await page.locator('#twoHandVolume').evaluate(e=>e.value);
 await frames([['Left',.75,.2,.1],['Right',.25,.75,.1]]);await page.waitForTimeout(500);assert.equal(await page.locator('#panelNote').innerText(),baseNote);assert.ok(Math.abs(await page.locator('#twoHandVolume').evaluate(e=>e.value)-baseVolume)<.001);
 await frames([['Left',.55,.2,.1],['Right',.25,.75,.1]]);await page.waitForTimeout(500);assert.equal(await page.locator('#panelNote').innerText(),baseNote);assert.ok(Math.abs(await page.locator('#twoHandVolume').evaluate(e=>e.value)-baseVolume)<.001);
 await frames([['Right',.25,.75,.1],['Left',.55,.4,.1]]);await page.waitForTimeout(650);assert.equal(await page.locator('#panelNote').innerText(),baseNote);assert.ok(await page.locator('#twoHandVolume').evaluate(e=>e.value)<baseVolume-.1);
 assert.ok(await page.evaluate(()=>window.__filters[0].frequency.value>19000 && window.__gains[2].gain.value===0 && window.__gains[3].gain.value===0));
 await frames([['Right',.25,.75,.1]]);await page.waitForFunction(()=>document.querySelector('#effectsRoleStatus').textContent==='Show your left hand for volume');await page.waitForTimeout(240);assert.ok(await page.evaluate(()=>window.__gains.at(-1).gain.value<.005));assert.equal(await page.locator('#twoHandVolume').evaluate(e=>e.value),0);
 await frames([['Left',.55,.4,.1],['Right',.25,.75,.1]]);await page.waitForFunction(()=>document.querySelector('#twoHandVolume').value>0);await page.waitForTimeout(240);assert.ok(await page.evaluate(()=>window.__gains.at(-1).gain.value>.1));
 await frames([['Left',.55,.4,.1]]);await page.waitForFunction(()=>document.querySelector('#melodyRoleStatus').textContent==='Show your right hand for notes');await page.waitForTimeout(240);assert.ok(await page.evaluate(()=>window.__gains.at(-1).gain.value<.005));
 await frames([['Right',.25,.75,.1],['Left',.55,.4,.1]]);await page.waitForFunction(()=>document.querySelector('#melodyRoleStatus').textContent.includes('detected'));
 await page.locator('#playMode').selectOption('challenge');await page.waitForFunction(()=>document.querySelector('#challengeStatus').textContent.includes('Listen'));await page.waitForTimeout(200);assert.match(await page.locator('#challengeStatus').innerText(),/0\/3/);
 await page.locator('#playMode').selectOption('free');await page.locator('#languageToggle').click();assert.match(await page.locator('#melodyRoleStatus').innerText(),/droite/);assert.match(await page.locator('#effectsRoleStatus').innerText(),/gauche/);
 await page.locator('.display-settings > summary').click();await page.locator('#displayMode').selectOption('hologram');assert.ok(await page.locator('.two-hand-panel').isVisible());assert.equal(await page.locator('#visualCanvas').evaluate(c=>c.width),3840);
 const output=path.join(process.env.TEMP,'invisible-orchestra-qa');fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'two-hand-simple.png'),fullPage:true});
 assert.equal(await page.evaluate(()=>window.__cameraCalls),1);assert.equal(await page.evaluate(()=>window.__contexts.length),1);
 await page.locator('#stopButton').click();await page.locator('#welcomePanel').waitFor({state:'visible'});assert.equal(await page.locator('#handMode').inputValue(),'two');assert.ok(await page.evaluate(()=>window.__stream.getTracks().every(t=>t.readyState==='ended') && window.__contexts[0].state==='closed'));
 await page.locator('#languageToggle').click();await page.locator('#fallbackButton').click();await page.locator('#loadingPanel').waitFor({state:'hidden'});
 const box=await page.locator('#stage').boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.waitForTimeout(160);assert.ok(await page.evaluate(()=>window.__sourceStarts)>0);
 await page.locator('#stopButton').click();assert.deepEqual(errors,[]);
 console.log('Two-hand checks passed with simulated detections: fixed physical roles, independent axes, silence on either missing hand, recovery, no pinch/brightness effect, challenge, French, UHD, fallback and cleanup. Live webcam testing remains.');
 await browser.close();server.kill();
})().catch(async error=>{console.error(error);await browser?.close();server?.kill();process.exitCode=1;});
