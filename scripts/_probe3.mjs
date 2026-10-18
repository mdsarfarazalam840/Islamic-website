import fs from "fs";
const k = JSON.parse(fs.readFileSync("opencode.json","utf-8")).provider.RadoxAI.options.apiKey;
const b = "https://radoxai.com/v1";
await new Promise(r=>setTimeout(r, 65000));
const sys = "You translate into Hindi Devanagari. Faithfully. No commentary. Reply as JSON {\"out\": [\"...\"]} with one per input.";
const inputs = ["Hello world - peace be upon you."];
for (const model of ["kimi-k2.6","gemma-2-2b","qwen3.7-max"]) {
  const r = await fetch(b+"/chat/completions",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+k},body:JSON.stringify({model,messages:[{role:"system",content:sys},{role:"user",content:JSON.stringify({in: inputs})}],temperature:0,max_tokens:500})});
  const t = await r.text();
  console.log("MODEL",model,r.status);
  console.log(t.slice(0,3000));
  try { const j=JSON.parse(t); console.log("content:", JSON.stringify(j.choices?.[0]?.message?.content?.slice(0,300))); console.log("usage",j.usage); } catch {}
  console.log("----");
  await new Promise(x=>setTimeout(x,5000));
}
