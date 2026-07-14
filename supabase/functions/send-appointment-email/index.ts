const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_EMAIL = "CitasMed <onboarding@resend.dev>";
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const key = globalThis.Deno?.env?.get("RESEND_API_KEY") ?? "";
globalThis.addEventListener("fetch", (e) => e.respondWith(handle(e.request)));
async function handle(req) {
  if (req.method === "OPTIONS") return new Response("ok", {headers:cors});
  try {
    const {to,subject,html} = await req.json();
    if (!to||!subject||!html) return new Response(JSON.stringify({error:"Faltan campos"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
    if (!key) return new Response(JSON.stringify({error:"Sin API key"}),{status:500,headers:{...cors,"Content-Type":"application/json"}});
    const r = await fetch(RESEND_API_URL,{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({from:FROM_EMAIL,to,subject,html})});
    const d = await r.json();
    if (!r.ok) return new Response(JSON.stringify({error:d}),{status:r.status,headers:{...cors,"Content-Type":"application/json"}});
    return new Response(JSON.stringify({id:d.id}),{status:200,headers:{...cors,"Content-Type":"application/json"}});
  } catch(e) {
    return new Response(JSON.stringify({error:String(e)}),{status:500,headers:{...cors,"Content-Type":"application/json"}});
  }
}
