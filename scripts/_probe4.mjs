import fs from "fs";
const keys = {
  radox: JSON.parse(fs.readFileSync("opencode.json","utf-8")).provider.RadoxAI.options.apiKey,
  tokenrouter: process.env.TOKENROUTER_API_KEY || fs.existsSync(".env.local") ? (()=>{try{const c=fs.readFileSync(".env.local","utf-8"); const m=c.match(/TOKENROUTER[^=]*=\s*(.+)/); return m?m[1].trim():process.env.TOKENROUTER_API_KEY}catch{return process.env.TOKENROUTER_API_KEY}})() : process.env.TOKENROUTER_API_KEY,
  xkiro: process.env.XKIRO_API_KEY || (()=>{try{const c=fs.readFileSync(".env.local","utf-8"); const m=c.match(/XKIRO[^=]*=\s*(.+)/); return m?m[1].trim():process.env.XKIRO_API_KEY}catch{return process.env.XKIRO_API_KEY}})(),
};
async function testProvider(name, base, key, model) {
  if (!key) { console.log(name, "no key"); return; }
  const sys = "You translate into Hindi Devanagari. Faithfully. Reply as JSON {\"out\": [\"...\"]}.";
  const body = JSON.stringify({model, messages:[{role:"system",content:sys},{role:"user",content:JSON.stringify({in:["Hello world"]})}],temperature:0,max_tokens:200});
  try {
    const r = await fetch(base+"/chat/completions",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+key},body});
    const t = await r.text();
    console.log(`${name} ${model} -> ${r.status} ${t.slice(0,800)}`);
  } catch(e){ console.log(name, e.message); }
  await new Promise(x=>setTimeout(x,3000));
}

console.log("keys", Object.fromEntries(Object.entries(keys).map(([k,v])=>[k, v?v.slice(0,8)+"...":"none"])));

// Try tokenrouter (usually openai compatible, base unknown - try common)
const trKey = process.env.TOKENROUTER_API_KEY;
if (trKey) {
  for (const base of ["https://api.tokenrouter.ai/v1","https://tokenrouter.ai/api/v1"]) {
    await testProvider("tokenrouter", base, trKey, "claude-sonnet-5");
  }
}
const xkKey = process.env.XKIRO_API_KEY;
if (xkKey) {
  for (const base of ["https://api.xkiro.ai/v1","https://xkiro.ai/api/v1","https://api.xkiorouter.com/v1"]) {
    await testProvider("xkiro", base, xkKey, "claude-sonnet-5");
  }
}
// Also try radox alternative models that worked with less rate limit impact: gemma/kimi may have higher rpm?
console.log("--- radox alt ---");
for (const m of ["gemma-2-2b","kimi-k2.6"]) {
  await testProvider("radox", "https://radoxai.com/v1", keys.radox, m);
}
