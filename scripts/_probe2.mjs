import fs from "fs";
const k = JSON.parse(fs.readFileSync("opencode.json","utf-8")).provider.RadoxAI.options.apiKey;
const b = "https://radoxai.com/v1";
const sys = "You translate into Hindi written in Devanagari script. Rules: Render meaning faithfully. Keep Islamic terminology (namaz, roza, iman) with nuqta. No commentary. Output Devanagari only. OUTPUT FORMAT: reply with a single JSON object and nothing else: {\"out\": [\"...\", \"...\"]} with exactly one output string per input string, in same order.";
const inputs = ["The Prophet said, None of you will have faith till he wishes for his brother what he likes for himself.", "A man asked the Prophet about the Hour. He said, What have you prepared for it?"];
for (const model of ["claude-sonnet-5","qwen3.7-max","deepseek-v4-pro-0813"]) {
  const body = JSON.stringify({model, messages:[{role:"system",content:sys},{role:"user",content:JSON.stringify({in:inputs})}], temperature:0, max_tokens:800});
  const r = await fetch(b+"/chat/completions",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+k}, body});
  const t = await r.text();
  console.log("MODEL",model,r.status);
  console.log(t.slice(0,1800));
  console.log("---");
  await new Promise(x=>setTimeout(x,8000));
}
