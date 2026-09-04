const { chromium } = require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.join(process.cwd(),'build');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let p=path.join(root,decodeURIComponent(req.url.split('?')[0]));
 if(!fs.existsSync(p)||fs.statSync(p).isDirectory())p=path.join(root,'index.html');
 res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});res.end(fs.readFileSync(p));});
(async()=>{
 await new Promise(r=>server.listen(4616,r));
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const page=await ctx.newPage();
 let bad=0;
 for (const [w,h] of [[900,500],[1024,600],[820,700],[1180,820],[820,1180],[768,1024],[600,900],[481,900],[390,844],[430,932],[1180,450]]) {
  await page.setViewportSize({width:w,height:h});
  await page.goto('http://localhost:4616/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:/PLAY DROID/i}).click();
  await page.waitForSelector('.dvh-panel',{timeout:15000});
  await page.waitForTimeout(350);
  const r=await page.evaluate(()=>{
    const submit=[...document.querySelectorAll('.dvh-panel > button')].pop();
    const sr=submit.getBoundingClientRect();
    const play=document.querySelector('.droid-human-play');
    const canScroll = play.scrollHeight > play.clientHeight + 1;
    const vis = () => { const t=document.elementFromPoint(sr.left+sr.width/2, Math.min(sr.top+sr.height/2, innerHeight-2));
      return !!t && (t===submit || submit.contains(t)); };
    // Overlap check on the visible panel
    const els=[...document.querySelectorAll('.dvh-panel *')].filter(e=>{
      const cs=getComputedStyle(e); if(cs.display==='none'||cs.visibility==='hidden')return false;
      if(![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return false;
      const rr=e.getBoundingClientRect(); return rr.width>2&&rr.height>2;});
    let overlaps=0;
    for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){const a=els[i],c=els[j];
      if(a.contains(c)||c.contains(a))continue;
      const ra=a.getBoundingClientRect(),rc=c.getBoundingClientRect();
      if(Math.min(ra.right,rc.right)-Math.max(ra.left,rc.left)>2 && Math.min(ra.bottom,rc.bottom)-Math.max(ra.top,rc.top)>2) overlaps++;}
    return { submitBottom:Math.round(sr.bottom), vh:innerHeight, canScroll, overlaps,
             onScreen: sr.bottom <= innerHeight + 1 };
  });
  const ok = (r.onScreen || r.canScroll) && r.overlaps === 0;
  if (!ok) bad++;
  console.log(`${String(w).padStart(4)}x${String(h).padEnd(5)} submit ${String(r.submitBottom).padStart(4)}/${String(r.vh).padEnd(4)} onScreen=${r.onScreen?'y':'n'} scrollable=${r.canScroll?'y':'n'} overlaps=${r.overlaps}  ${ok?'OK':'*** FAIL'}`);
 }
 console.log(bad?`\n${bad} FAILING SIZE(S)`:'\nall sizes usable');
 await b.close(); server.close();
})();
