import fs from "node:fs";
import path from "node:path";

const HADITH_DIR = path.resolve("public/data/hadith");
const STATE_DIR = path.resolve(".batch-state");
const DONE_FILE = path.join(STATE_DIR, "done-hadith.txt");
const STATE_FILE = path.join(STATE_DIR, "ai-hindi-pass.json");

const COLLECTIONS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"];

// RadoxAI OpenAI-compatible
const API_KEY = process.env.RADOX_API_KEY || fs.existsSync("opencode.json") ? JSON.parse(fs.readFileSync("opencode.json","utf-8")).provider?.RadoxAI?.options?.apiKey : "";
const BASE_URL = "https://radoxai.com/v1";
const MODEL = process.env.MODEL || "claude-opus-5.5";
// Alternative fallback models if opus rate limited (in order of preference for Hindi)
const FALLBACK_MODELS = ["claude-sonnet-5", "qwen3.7-max", "deepseek-v4-pro-max", "grok-4.6"];

const BATCH_SIZE = Number(process.env.BATCH_SIZE || "8");
const CONCURRENCY = 1; // strict due to token rate limit
const FLUSH_EVERY = Number(process.env.FLUSH_EVERY || "20"); // batches
const RETRY_AFTER_DEFAULT = 60_000;

const SYSTEM_PROMPT = `You translate into Hindi written in Devanagari script.

Rules:
- Render the meaning faithfully and completely. Do not summarise or expand.
- Keep Islamic religious terminology in its familiar Urdu/Hindi form rather than Sanskritised substitutes (नमाज़, रोज़ा, ईमान, रसूल, फ़रिश्ता, क़यामत, इबादत), with nuqta where the word takes one.
- Keep proper nouns and honorifics as they appear (अल्लाह, मुहम्मद ﷺ, अबू हुरैरा).
- Do NOT add commentary, explanation, grading, or bracketed notes of your own.
- Do NOT translate or alter text that is already Hindi.
- Output Devanagari only, apart from characters that were already Latin or Arabic in the source.

OUTPUT FORMAT: reply with a single JSON object and nothing else - no prose, no explanation, no code fences:
{"out": ["...", "..."]}
with exactly one output string per input string, in the same order.`;

function safeId(id) { return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function loadDone(){
  if(!fs.existsSync(DONE_FILE)) return new Set();
  return new Set(fs.readFileSync(DONE_FILE,"utf-8").split("\n").map(s=>s.trim()).filter(Boolean));
}
function appendDone(ids){
  if(!ids.length) return;
  fs.mkdirSync(STATE_DIR,{recursive:true});
  fs.appendFileSync(DONE_FILE, ids.join("\n")+"\n");
}
function hadithBookFiles(col){
  const dir=path.join(HADITH_DIR,col,"books");
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f=>f.startsWith("book-")&&f.endsWith(".json"))
    .sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0]))
    .map(f=>path.join(dir,f));
}

function collectMissing(){
  const units=[];
  for(const col of COLLECTIONS){
    for(const file of hadithBookFiles(col)){
      const arr=JSON.parse(fs.readFileSync(file,"utf-8"));
      const sidecarFile=path.join(HADITH_DIR,col,"hindi",path.basename(file));
      let sidecar={};
      if(fs.existsSync(sidecarFile)){
        try{ sidecar=JSON.parse(fs.readFileSync(sidecarFile,"utf-8")); }catch{}
      }
      for(const h of arr){
        const urdu=(h.urdu||"").trim();
        const english=(h.english||"").trim();
        const src=urdu ? "ur" : english ? "en" : null;
        if(!src) continue;
        // dual-key check: sidecar may store "690_2" or "690.2"
        const key1=String(h.number);
        const key2=key1.replace(/[^a-zA-Z0-9_-]/g,"_");
        const hasHindi = (sidecar[key1]?.text?.trim() || sidecar[key2]?.text?.trim());
        if(hasHindi) continue;
        const bookId=h.bookId ?? Number(path.basename(file).match(/\d+/)[0]);
        const id=safeId(`hadith-${col}-${bookId}-${h.number}-${src}`);
        units.push({ id, col, bookId: String(bookId), number: String(h.number), src, text: src==="ur"?urdu:english, sidecarFile });
      }
    }
  }
  return units;
}

async function callChat(model, inputs){
  // inputs: string[]
  const body=JSON.stringify({
    model,
    messages:[
      {role:"system", content: SYSTEM_PROMPT},
      {role:"user", content: JSON.stringify({in: inputs})}
    ],
    temperature:0,
    max_tokens: Math.min(8000, Math.max(1024, inputs.reduce((n,s)=>n+s.length,0)+512))
  });
  let lastErr="";
  for(let attempt=0; attempt<6; attempt++){
    const res=await fetch(`${BASE_URL}/chat/completions`,{
      method:"POST",
      headers:{"content-type":"application/json","authorization":`Bearer ${API_KEY}`},
      body
    });
    const text=await res.text();
    if(res.ok){
      try{
        const j=JSON.parse(text);
        const content=j.choices?.[0]?.message?.content || "";
        // Parse JSON object with "out"
        const start=content.indexOf("{");
        const end=content.lastIndexOf("}");
        if(start===-1||end<=start) throw new Error("No JSON object in response: "+content.slice(0,300));
        const parsed=JSON.parse(content.slice(start,end+1));
        if(!Array.isArray(parsed.out)) throw new Error("Missing out array");
        return parsed.out;
      }catch(e){
        lastErr=e.message;
        // retry
      }
    } else {
      lastErr=`${res.status}: ${text.slice(0,500)}`;
      const retryAfter=res.headers.get("retry-after");
      if(res.status===429){
        const waitMs= retryAfter ? Number(retryAfter)*1000 : RETRY_AFTER_DEFAULT;
        console.log(`  429 rate limited, waiting ${waitMs/1000}s (attempt ${attempt+1}/6)`);
        await sleep(waitMs + 2000);
        // on 429 also try rotating model after 2 attempts
        if(attempt===2){
          // will be retried by outer caller with different model
          throw new Error(lastErr);
        }
        continue;
      }
      if(res.status>=500){
        await sleep(Math.min(60000, 2000*Math.pow(2,attempt)));
        continue;
      }
      throw new Error(lastErr);
    }
    await sleep(1000*Math.pow(2,attempt));
  }
  throw new Error(`Failed after retries: ${lastErr}`);
}

function groupByFile(units){
  const m=new Map();
  for(const u of units){
    if(!m.has(u.sidecarFile)) m.set(u.sidecarFile, []);
    m.get(u.sidecarFile).push(u);
  }
  return m;
}

async function main(){
  const apiKey=API_KEY;
  if(!apiKey) throw new Error("No API key found in opencode.json");
  console.log(`Model: ${MODEL}  Batch size: ${BATCH_SIZE}  Endpoint: ${BASE_URL}`);
  const allMissing=collectMissing();
  console.log(`Total missing (dual-key): ${allMissing.length}`);
  // stats by collection
  const byC={};
  for(const u of allMissing) byC[u.col]=(byC[u.col]||0)+1;
  console.log("By collection:", byC);

  const done=loadDone();
  console.log(`Ledger entries: ${done.size}`);
  const todo=allMissing.filter(u=>!done.has(u.id));
  console.log(`To translate (after ledger): ${todo.length} (skipped ${allMissing.length-todo.length} already in ledger)`);

  if(todo.length===0){ console.log("Nothing to do."); return; }

  // Sort deterministic
  todo.sort((a,b)=>a.id.localeCompare(b.id));

  // Batch into chunks
  const batches=[];
  for(let i=0;i<todo.length;i+=BATCH_SIZE) batches.push(todo.slice(i,i+BATCH_SIZE));
  console.log(`Batches: ${batches.length} x ~${BATCH_SIZE}`);

  // Load state for reporting
  let state=null;
  if(fs.existsSync(STATE_FILE)){
    try{ state=JSON.parse(fs.readFileSync(STATE_FILE,"utf-8")); }catch{}
  }

  let appliedBatches=0;
  let appliedUnits=0;
  let errored=0;
  const pendingLedger=[];
  let modelIdx=0;
  const models=[MODEL, ...FALLBACK_MODELS.filter(m=>m!==MODEL)];

  for(let bi=0; bi<batches.length; bi++){
    const batch=batches[bi];
    const inputs=batch.map(b=>b.text);
    let out=null;
    let lastErr="";
    // try models in order for this batch
    for(let mi=0; mi<models.length; mi++){
      const m=models[(modelIdx+mi)%models.length];
      try{
        out=await callChat(m, inputs);
        if(out.length!==inputs.length) throw new Error(`Length mismatch: got ${out.length} for ${inputs.length}`);
        modelIdx=(modelIdx+mi)%models.length; // stick with working model
        break;
      }catch(e){
        lastErr=e.message;
        console.log(`  Batch ${bi+1}/${batches.length} failed with ${m}: ${e.message.slice(0,200)}`);
        if(e.message.includes("429") && mi < models.length-1){
          await sleep(5000);
          continue;
        }
        if(mi===models.length-1) break;
      }
    }
    if(!out){
      console.log(`  ✗ Batch ${bi+1} failed all models, skipping ${batch.length} units. Last: ${lastErr.slice(0,200)}`);
      errored+=batch.length;
      // do NOT add to ledger, will retry next run
      await sleep(10000);
      continue;
    }

    // Validate each output
    const validated=[];
    for(let i=0;i<out.length;i++){
      const raw=(typeof out[i]==="string"?out[i]:"").trim();
      const src=batch[i].src;
      // Must be non-empty and contain Devanagari for translation jobs
      const hasDev=/[ऀ-ॿ]/.test(raw);
      if(!raw || !hasDev){
        console.log(`  ⚠ ${batch[i].id}: output missing Devanagari, keeping original skipped`);
        errored++;
        continue;
      }
      validated.push({ unit: batch[i], text: raw });
    }

    // Group by sidecar file and write
    const byFile=new Map();
    for(const v of validated){
      if(!byFile.has(v.unit.sidecarFile)) byFile.set(v.unit.sidecarFile, []);
      byFile.get(v.unit.sidecarFile).push(v);
    }
    for(const [file, entries] of byFile){
      fs.mkdirSync(path.dirname(file),{recursive:true});
      let sidecar={};
      if(fs.existsSync(file)){
        try{ sidecar=JSON.parse(fs.readFileSync(file,"utf-8")); }catch{ sidecar={}; }
      }
      for(const {unit, text} of entries){
        const existing=sidecar[unit.number] || {};
        // normalize key: use String(number) as stored; but for decimals the apply logic uses underscore form.
        // We store under both? For compatibility, store under String(number) so future dual-key finds it.
        // But also ensure underscore key exists if number contains '.'
        const k1=String(unit.number);
        const k2=k1.replace(/[^a-zA-Z0-9_-]/g,"_");
        const entry={
          explanation: existing.explanation ?? "",
          hints: existing.hints ?? [],
          attribution: existing.attribution ?? "",
          grade: existing.grade ?? "",
          sourceId: existing.sourceId ?? "",
          text,
          textSource: unit.src  // "en" or "ur"
        };
        sidecar[k1]=entry;
        if(k2!==k1) sidecar[k2]=entry;
      }
      fs.writeFileSync(file, JSON.stringify(sidecar,null,2));
    }

    // Ledger: only after successful write
    const ids=validated.map(v=>v.unit.id);
    appendDone(ids);
    pendingLedger.push(...ids);
    appliedUnits+=validated.length;
    appliedBatches++;
    if(state){
      state.applied=(state.applied||0)+validated.length;
      state.usage={input: (state.usage?.input||0), output: (state.usage?.output||0)};
      try{ fs.writeFileSync(STATE_FILE, JSON.stringify(state,null,2)); }catch{}
    }
    console.log(`  ✓ Batch ${bi+1}/${batches.length}: ${validated.length}/${batch.length} applied (total ${appliedUnits}/${todo.length})`);
    if(appliedBatches % FLUSH_EVERY ===0){
      console.log(`  -- checkpoint ${appliedUnits} units --`);
    }
    // Rate limit courtesy delay
    await sleep(2500);
  }

  console.log(`\nDone. Applied ${appliedUnits}, errored ${errored}, batches ${appliedBatches}/${batches.length}`);
  if(state){
    state.applied=appliedUnits + (state.applied||0) - appliedUnits; // already updated incrementally
    try{ fs.writeFileSync(STATE_FILE, JSON.stringify(state,null,2)); }catch{}
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });
