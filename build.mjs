import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {Script} from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('./',import.meta.url);
const html=readFileSync(new URL('index.html',root),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'IDs duplicados na página');
for(const file of ['app.js','dashboard.js']){
 const source=readFileSync(new URL(file,root),'utf8');new Script(source,{filename:file});
 for(const [,id] of source.matchAll(/\bel\('([^']+)'\)/g))assert(ids.includes(id),'Elemento ausente: '+id);
}
assert(html.includes("script-src 'self'"),'Scripts locais bloqueados');
assert(html.includes('id="allocationTarget"'),'Seletor de destino da planilha ausente');
assert(html.includes('value="single"'),'Opção de envio para um único consultor ausente');
const dashboard=readFileSync(new URL('dashboard.js',root),'utf8');
assert(dashboard.includes("el('allocationTarget').value==='single'"),'Regra de seleção única ausente');
assert(dashboard.includes("distribution_mode:single?'equal'"),'Envio único deve usar a distribuição integral existente');
mkdirSync(new URL('dist/',root),{recursive:true});
for(const file of ['index.html','app.js','dashboard.js','styles.css','logo.png','privacidade.html','suporte.html','exclusao-de-dados.html'])copyFileSync(new URL(file,root),new URL('dist/'+file,root));
console.log('Painel validado e arquivos públicos preparados.');
