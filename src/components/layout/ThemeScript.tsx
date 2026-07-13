// ═══════════════════════════════════════════════════════════════════════════
// Inline script — runs BEFORE paint, reads the current/legacy theme cookie and applies
// CSS custom properties to <html>. No flash, no layout re-execution needed.
// ═══════════════════════════════════════════════════════════════════════════
// Keep in sync with THEME_PROPERTIES in lib/theme-config.ts

import { THEME_COOKIE_NAMES } from "@/lib/theme-config";

const SCRIPT = `
(function(){
  try{
    var names=${JSON.stringify(THEME_COOKIE_NAMES)};
    var map={bg:'--bg',surface:'--surface',border:'--border',text:'--text',primary:'--primary',
             sidebarBg:'--sidebar-bg',sidebarText:'--sidebar-text',
             kernel:'--kernel',module:'--module',resource:'--resource'};
    var h={border:'--border-subtle',primary:'--primary-h',kernel:'--kernel-h',module:'--module-h',resource:'--resource-h'};
    var rows=document.cookie.split('; '),t;
    for(var i=0;i<names.length&&!t;i++){
      var cs=rows.filter(function(r){return r.startsWith(names[i]+'=')});
      for(var j=cs.length-1;j>=0&&!t;j--){
        try{var candidate=JSON.parse(decodeURIComponent(cs[j].split('=').slice(1).join('='))),valid=false;if(candidate&&typeof candidate==='object'&&!Array.isArray(candidate)){for(var ck in candidate){if((ck==='mode'&&(candidate[ck]==='light'||candidate[ck]==='dark'||candidate[ck]==='custom'))||(map[ck]&&typeof candidate[ck]==='string'&&/^#[0-9a-f]{6}$/i.test(candidate[ck]))){valid=true;break}}if(valid)t=candidate}}catch(e){}
      }
    }
    if(!t)return;
    var r=document.documentElement;
    for(var k in t){
      if(k==='mode'){if(t[k]==='dark')r.classList.add('dark');else r.classList.remove('dark');continue}
      var v=map[k];if(v&&typeof t[k]==='string'&&/^#[0-9a-f]{6}$/i.test(t[k])){r.style.setProperty(v,t[k]);var d=h[k];if(d)r.style.setProperty(d,t[k])}
    }
    if(typeof t.text==='string'&&/^#[0-9a-f]{6}$/i.test(t.text)){r.style.setProperty('--text-muted',t.text+'cc');r.style.setProperty('--text-subtle',t.text+'88')}
  }catch(e){}
})();
`.trim();

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
