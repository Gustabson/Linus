// ═══════════════════════════════════════════════════════════════════════════
// Inline script — runs BEFORE paint, reads eduhub_theme cookie and applies
// CSS custom properties to <html>. No flash, no layout re-execution needed.
// ═══════════════════════════════════════════════════════════════════════════
// Keep in sync with THEME_PROPERTIES in lib/theme-config.ts

const SCRIPT = `
(function(){
  try{
    var cs=document.cookie.split('; ').filter(function(r){return r.startsWith('eduhub_theme=')});
    var c=cs[cs.length-1];
    if(!c)return;
    var t=JSON.parse(decodeURIComponent(c.split('=')[1]));
    var r=document.documentElement;
    var map={bg:'--bg',surface:'--surface',border:'--border',text:'--text',primary:'--primary',
             sidebarBg:'--sidebar-bg',sidebarText:'--sidebar-text',
             kernel:'--kernel',module:'--module',resource:'--resource'};
    var h={border:'--border-subtle',primary:'--primary-h',kernel:'--kernel-h',module:'--module-h',resource:'--resource-h'};
    for(var k in t){
      if(k==='mode'){if(t[k]==='dark')r.classList.add('dark');else r.classList.remove('dark');continue}
      var v=map[k];if(v){r.style.setProperty(v,t[k]);var d=h[k];if(d)r.style.setProperty(d,t[k])}
    }
    if(t.text){r.style.setProperty('--text-muted',t.text+'cc');r.style.setProperty('--text-subtle',t.text+'88')}
  }catch(e){}
})();
`.trim();

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
