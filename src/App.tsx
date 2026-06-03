import { useState } from "react";

const COACH = {
  name: "Jeff Williams",
  sport: "Tennis",
  location: "Ocala, FL",
  avatar: "JW",
  color: "#1d4ed8",
  bio: "USPTA certified tennis pro with 15 years of teaching experience. Rated 4.5 and passionate about competitive development — Jeff has coached multiple students to ITF Gold achievements.",
  rating: 5.0,
};

const PRIVATE_SERVICES = [
  { id: "30min", name: "30 Min Lesson", duration: 30, price: 35, desc: "Quick focused session — perfect for working on one specific skill." },
  { id: "60min", name: "60 Min Lesson", duration: 60, price: 70, desc: "Full one-on-one instruction tailored to your game." },
];

const CLINICS = [
  { id: "cardio", name: "Cardio Tennis Clinic", day: "Thursdays", time: "7:00 PM", desc: "High-energy cardio tennis with music! Mixed men & women, all levels welcome. Sign up and Jeff will confirm your spot.", level: "All levels", inviteOnly: false, emoji: "🎵" },
  { id: "mens", name: "Men's Clinic", day: "Mondays", time: "6:00 PM", desc: "Competitive men's clinic focused on match play and technique refinement.", level: "3.0+", inviteOnly: true, emoji: "🎾" },
  { id: "womens", name: "Women's Clinic", day: "Thursdays", time: "6:00 PM", desc: "Women's clinic focused on strategy, consistency, and competitive development.", level: "3.0+", inviteOnly: true, emoji: "🎾" },
  { id: "mens35", name: "Men's 3.5+ Group", day: "Saturdays", time: "7:45 – 9:00 AM", desc: "Advanced men's group for competitive players looking to sharpen their game.", level: "3.5+", inviteOnly: true, emoji: "🏆" }
];

const LEVELS = ["Beginner", "2.5", "3.0", "3.5", "4.0+"];
const GOALS = ["Private Lessons", "Group Clinics", "Competitive Play", "Just for Fun"];

function generateSlots(durationMins, date) {
  const day = date.getDay();
  let startHour, endHour;
  if (day >= 1 && day <= 4) { startHour = 16; endHour = 21; }
  else if (day === 5 || day === 6) { startHour = 8; endHour = 12; }
  else return [];
  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h * 60 + m + durationMins > endHour * 60) continue;
      slots.push({
        label: `${h % 12 || 12}:${m === 0 ? "00" : m} ${h < 12 ? "AM" : "PM"}`,
        value: `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`
      });
    }
  }
  return slots;
}
function toMins(t) { const [h,m]=t.split(":").map(Number); return h*60+m; }
function overlaps(s,e,bs,be) { return s<be && e>bs; }
function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
function fmtDate(d) { return d.toISOString().split("T")[0]; }

async function fetchAvailability(dateStr) {
  const res = await fetch("/api/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getBusy", date: dateStr })
  });
  const data = await res.json();
  if (!data.busy) return [];
  return data.busy.map(b => ({
    start: b.start.split("T")[1].substring(0,5),
    end: b.end.split("T")[1].substring(0,5)
  }));
}

async function createCalendarEvent(service, dateStr, timeStr, customer) {
  const [h,m] = timeStr.split(":").map(Number);
  const endM = h*60+m+service.duration;
  const endStr = `${String(Math.floor(endM/60)).padStart(2,"0")}:${String(endM%60).padStart(2,"0")}`;
  await fetch("/api/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "createEvent",
      event: {
        summary: `Tennis – ${service.name} with ${customer.name}`,
        description: `Client: ${customer.name} | ${customer.email} | ${customer.phone} | $${service.price}`,
        start: { dateTime: `${dateStr}T${timeStr}:00`, timeZone: "America/New_York" },
        end: { dateTime: `${dateStr}T${endStr}:00`, timeZone: "America/New_York" },
      }
    })
  });
}

function Stars({ r }) {
  return <span style={{color:"#f59e0b",fontSize:13}}>{"★".repeat(Math.round(r))}{"☆".repeat(5-Math.round(r))}</span>;
}
function BackBtn({ onClick }) {
  return <button onClick={onClick} style={{background:"none",border:"none",color:"#2563eb",fontWeight:600,fontSize:13,cursor:"pointer",padding:"16px 20px 8px",display:"block"}}>← Back</button>;
}
function PrimaryBtn({ children, onClick, disabled, full }) {
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      display:"block", width: full?"100%":undefined,
      padding:"14px 24px", borderRadius:14, fontWeight:700, fontSize:16,
      background: disabled?"#e2e8f0":"#1d4ed8", color: disabled?"#94a3b8":"#fff",
      border:"none", cursor: disabled?"not-allowed":"pointer", transition:"opacity .15s"
    }}>{children}</button>
  );
}

function FormField({ id, label, placeholder, type="text", value, onChange, error }) {
  return (
    <div style={{marginBottom:12}}>
      <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:4}}>{label}</label>
      <input type={type} placeholder={placeholder} value={value}
        onChange={e=>onChange(id, e.target.value)}
        style={{width:"100%",padding:"11px 14px",borderRadius:12,border:`1.5px solid ${error?"#f87171":"#e2e8f0"}`,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
      {error && <p style={{color:"#ef4444",fontSize:11,margin:"3px 0 0"}}>{error}</p>}
    </div>
  );
}

function FormSelect({ id, label, options, value, onChange, error }) {
  return (
    <div style={{marginBottom:12}}>
      <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:4}}>{label}</label>
      <select value={value} onChange={e=>onChange(id, e.target.value)}
        style={{width:"100%",padding:"11px 14px",borderRadius:12,border:`1.5px solid ${error?"#f87171":"#e2e8f0"}`,fontSize:14,outline:"none",background:"#fff",boxSizing:"border-box"}}>
        <option value="">Select...</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
      {error && <p style={{color:"#ef4444",fontSize:11,margin:"3px 0 0"}}>{error}</p>}
    </div>
  );
}

// ── Welcome ────────────────────────────────────────────────────────────────
function WelcomeView({ onEnter, existingLeads }) {
  const [mode, setMode] = useState("signup"); // "signup" or "signin"
  const [f, setF] = useState({ name:"", email:"", phone:"", level:"", goal:"" });
  const [signInEmail, setSignInEmail] = useState("");
  const [errs, setErrs] = useState({});
  const [signInErr, setSignInErr] = useState("");

  function handleChange(id, val) { setF(p=>({...p,[id]:val})); }

  function validate() {
    const e = {};
    if (!f.name.trim()) e.name = "Required";
    if (!f.email.includes("@")) e.email = "Enter a valid email";
    if (f.phone.replace(/\D/g,"").length < 10) e.phone = "Enter a valid phone";
    if (!f.level) e.level = "Please select";
    if (!f.goal) e.goal = "Please select";
    return e;
  }

  function submit() {
    const e = validate(); setErrs(e);
    if (Object.keys(e).length) return;
    onEnter(f, false);
  }

  function signIn() {
    const found = existingLeads.find(l => l.email.toLowerCase() === signInEmail.toLowerCase().trim());
    if (!found) {
      setSignInErr("No account found with that email. Please sign up!");
      return;
    }
    onEnter(found, true);
  }

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
      <div style={{background:"#fff",borderRadius:24,padding:"32px 24px",maxWidth:420,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:48,marginBottom:8}}>🎾</div>
          <h1 style={{fontSize:24,fontWeight:800,color:"#0f172a",margin:"0 0 4px"}}>Jeff Williams Tennis</h1>
          <p style={{fontSize:14,color:"#64748b",margin:0}}>Effective coaching</p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:8}}><Stars r={5}/></div>
        </div>

        {/* Toggle */}
        <div style={{display:"flex",background:"#f1f5f9",borderRadius:12,padding:4,marginBottom:24}}>
          {[["signup","New Client"],["signin","Returning Client"]].map(([m,label])=>(
            <button key={m} onClick={()=>{setMode(m);setErrs({});setSignInErr("");}} style={{
              flex:1, padding:"8px", borderRadius:10, fontWeight:600, fontSize:13, cursor:"pointer",
              background: mode===m?"#fff":"transparent",
              color: mode===m?"#0f172a":"#64748b",
              border:"none",
              boxShadow: mode===m?"0 1px 3px rgba(0,0,0,.1)":"none"
            }}>{label}</button>
          ))}
        </div>

        {mode === "signup" && (
          <>
            <p style={{fontSize:13,color:"#475569",textAlign:"center",marginBottom:20,lineHeight:1.5}}>Tell us a little about yourself to get started!</p>
            <FormField id="name" label="Full Name" placeholder="Jane Smith" value={f.name} onChange={handleChange} error={errs.name}/>
            <FormField id="email" label="Email" placeholder="jane@example.com" type="email" value={f.email} onChange={handleChange} error={errs.email}/>
            <FormField id="phone" label="Phone" placeholder="(352) 555-0100" type="tel" value={f.phone} onChange={handleChange} error={errs.phone}/>
            <FormSelect id="level" label="Skill Level" options={LEVELS} value={f.level} onChange={handleChange} error={errs.level}/>
            <FormSelect id="goal" label="What brings you here?" options={GOALS} value={f.goal} onChange={handleChange} error={errs.goal}/>
            <div style={{marginTop:20}}><PrimaryBtn full onClick={submit}>Let's Play →</PrimaryBtn></div>
          </>
        )}

        {mode === "signin" && (
          <>
            <p style={{fontSize:13,color:"#475569",textAlign:"center",marginBottom:20,lineHeight:1.5}}>Welcome back! Enter your email to continue.</p>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:4}}>Email Address</label>
              <input type="email" placeholder="jane@example.com" value={signInEmail}
                onChange={e=>{ setSignInEmail(e.target.value); setSignInErr(""); }}
                style={{width:"100%",padding:"11px 14px",borderRadius:12,border:`1.5px solid ${signInErr?"#f87171":"#e2e8f0"}`,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
              {signInErr && <p style={{color:"#ef4444",fontSize:12,margin:"4px 0 0"}}>{signInErr}</p>}
            </div>
            <div style={{marginTop:20}}><PrimaryBtn full onClick={signIn}>Sign In →</PrimaryBtn></div>
            <p style={{textAlign:"center",fontSize:12,color:"#94a3b8",marginTop:16}}>First time here? <button onClick={()=>setMode("signup")} style={{background:"none",border:"none",color:"#1d4ed8",fontWeight:600,cursor:"pointer",fontSize:12}}>Sign up</button></p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Home ───────────────────────────────────────────────────────────────────
function HomeView({ onBook, onClinics, onDashboard, onPortal, lead, isAdmin }) {
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState("private");
  return (
    <div>
      <div style={{background:"linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%)",padding:"36px 24px 32px",color:"#fff",position:"relative"}}>
        <div style={{position:"absolute",top:16,right:16,display:"flex",gap:8}}>
          <button onClick={onPortal} style={{background:"rgba(255,255,255,.15)",border:"none",color:"#fff",padding:"5px 14px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer"}}>My Sessions</button>
          {isAdmin && <button onClick={onDashboard} style={{background:"rgba(255,255,255,.15)",border:"none",color:"#fff",padding:"5px 14px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer"}}>Admin</button>}
        </div>
        <div style={{fontSize:42,marginBottom:10}}>🎾</div>
        <h1 style={{fontSize:26,fontWeight:800,margin:"0 0 4px"}}>Jeff Williams Tennis</h1>
        <p style={{opacity:.8,margin:"0 0 6px",fontSize:14}}>Ocala, FL · Effective coaching</p>
        {lead?.name && <p style={{opacity:.9,margin:"0 0 10px",fontSize:13}}>Welcome, {lead.name.split(" ")[0]}! 👋</p>}
        <Stars r={COACH.rating}/>
      </div>
      <div style={{padding:"20px 20px 0",maxWidth:580,margin:"0 auto"}}>
        <div style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:16}}>
          <div style={{width:56,height:56,borderRadius:"50%",background:COACH.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:18,flexShrink:0}}>JW</div>
          <p style={{fontSize:14,color:"#475569",lineHeight:1.65,margin:0}}>{COACH.bio}</p>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:22}}>
          {["15 Years Teaching","4.5 Rated","ITF Gold Coach","Ocala, FL"].map(b=>(
            <span key={b} style={{background:"#eff6ff",color:"#1d4ed8",fontSize:12,fontWeight:600,padding:"4px 12px",borderRadius:20}}>{b}</span>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          {[["private","🎾 Private Sessions"],["clinics","👥 Clinics"]].map(([t,label])=>(
            <button key={t} onClick={()=>{setTab(t);setSel(null);}} style={{
              flex:1, padding:"12px 8px", borderRadius:14, fontWeight:700, fontSize:14, cursor:"pointer",
              background: tab===t?"#1d4ed8":"#fff", color: tab===t?"#fff":"#64748b",
              border: tab===t?"none":"2px solid #e2e8f0"
            }}>{label}</button>
          ))}
        </div>
        {tab === "private" && (
          <>
            <h2 style={{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:4}}>Book a Private Session</h2>
            <p style={{fontSize:13,color:"#64748b",marginBottom:14}}>30 min and 60 min sessions available.</p>
            {PRIVATE_SERVICES.map(s => (
              <div key={s.id} onClick={()=>setSel(s)} style={{
                borderRadius:16, border:`2px solid ${sel?.id===s.id?"#1d4ed8":"#e2e8f0"}`,
                background: sel?.id===s.id?"#eff6ff":"#fff",
                padding:"14px 16px", marginBottom:10, cursor:"pointer",
                display:"flex", justifyContent:"space-between", alignItems:"center"
              }}>
                <div>
                  <div style={{fontWeight:600,fontSize:15,color:"#0f172a"}}>{s.name}</div>
                  <div style={{fontSize:12,color:"#64748b",marginTop:3}}>{s.desc}</div>
                  <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{s.duration} min</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                  <div style={{fontSize:20,fontWeight:800,color:"#0f172a"}}>${s.price}</div>
                  {sel?.id===s.id && <div style={{fontSize:11,color:"#1d4ed8",fontWeight:600}}>Selected ✓</div>}
                </div>
              </div>
            ))}
            <div style={{marginTop:20,paddingBottom:32}}>
              <PrimaryBtn full disabled={!sel} onClick={()=>sel&&onBook(sel)}>
                {sel ? `Book ${sel.name} · $${sel.price}` : "Select a session to continue"}
              </PrimaryBtn>
            </div>
          </>
        )}
        {tab === "clinics" && (
          <div style={{paddingBottom:32}}>
            <h2 style={{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:4}}>Join a Clinic</h2>
            <p style={{fontSize:13,color:"#64748b",marginBottom:14}}>Group sessions — open and invite-only options available.</p>
            {CLINICS.map(c => (
              <div key={c.id} style={{background:"#fff",border:`2px solid ${c.inviteOnly?"#e2e8f0":"#86efac"}`,borderRadius:20,padding:"18px",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:16,color:"#0f172a"}}>{c.emoji} {c.name}</div>
                    <div style={{fontSize:13,color:"#64748b",marginTop:2}}>{c.day} · {c.time}</div>
                    <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>Level: {c.level}</div>
                  </div>
                  {c.inviteOnly
                    ? <span style={{background:"#fef3c7",color:"#92400e",fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,whiteSpace:"nowrap"}}>Invite Only</span>
                    : <span style={{background:"#dcfce7",color:"#15803d",fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,whiteSpace:"nowrap"}}>Open</span>
                  }
                </div>
                <p style={{fontSize:13,color:"#475569",lineHeight:1.5,margin:"0 0 12px"}}>{c.desc}</p>
                {c.inviteOnly
                  ? <button onClick={()=>onClinics(c)} style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:12,padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Request an Invite</button>
                  : <button onClick={()=>onClinics(c)} style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:12,padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Sign Up →</button>
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Clinic Sign Up ─────────────────────────────────────────────────────────
function ClinicSignUpView({ clinic, onBack, lead }) {
  const [f, setF] = useState({ name: lead?.name||"", email: lead?.email||"", phone: lead?.phone||"" });
  const [errs, setErrs] = useState({});
  const [submitted, setSubmitted] = useState(false);
  function handleChange(id, val) { setF(p=>({...p,[id]:val})); }
  function validate() {
    const e = {};
    if (!f.name.trim()) e.name = "Required";
    if (!f.email.includes("@")) e.email = "Enter a valid email";
    if (f.phone.replace(/\D/g,"").length < 10) e.phone = "Enter a valid phone";
    return e;
  }
  function submit() {
    const e = validate(); setErrs(e);
    if (Object.keys(e).length) return;
    fetch("/api/proxy", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"addToMailchimp", name:f.name, email:f.email, phone:f.phone, tags:["Tennis","Cardio Clinic"] }) });
    fetch("/api/proxy", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"sendEmail", to:"jwlegacyrealty@gmail.com", subject:"New Cardio Clinic Sign Up!", body:`Name: ${f.name}\nEmail: ${f.email}\nPhone: ${f.phone}` }) });
    setSubmitted(true);
  }
  if (submitted) return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"60px 24px",textAlign:"center"}}>
      <div style={{fontSize:56,marginBottom:16}}>🎵</div>
      <h1 style={{fontSize:24,fontWeight:800,color:"#0f172a",marginBottom:8}}>You're signed up!</h1>
      <p style={{color:"#64748b",marginBottom:24}}>Jeff will be in touch to confirm your spot.</p>
      <PrimaryBtn full onClick={onBack}>Back to Home</PrimaryBtn>
    </div>
  );
  return (
    <div style={{maxWidth:480,margin:"0 auto"}}>
      <BackBtn onClick={onBack}/>
      <div style={{padding:"0 20px 32px"}}>
        <div style={{background:"#f0fdf4",borderRadius:16,padding:"14px 16px",marginBottom:20}}>
          <div style={{fontWeight:700,fontSize:15,color:"#15803d"}}>🎵 Cardio Tennis Clinic</div>
          <div style={{fontSize:13,color:"#16a34a"}}>Thursdays · 7:00 PM · All levels · Music!</div>
        </div>
        <h1 style={{fontSize:20,fontWeight:800,color:"#0f172a",marginBottom:16}}>Sign Up</h1>
        <FormField id="name" label="Full Name" placeholder="Jane Smith" value={f.name} onChange={handleChange} error={errs.name}/>
        <FormField id="email" label="Email" placeholder="jane@example.com" type="email" value={f.email} onChange={handleChange} error={errs.email}/>
        <FormField id="phone" label="Phone" placeholder="(352) 555-0100" type="tel" value={f.phone} onChange={handleChange} error={errs.phone}/>
        <div style={{marginTop:20}}><PrimaryBtn full onClick={submit}>Sign Me Up! →</PrimaryBtn></div>
      </div>
    </div>
  );
}

// ── Request Invite ─────────────────────────────────────────────────────────
function RequestInviteView({ clinic, onBack, lead }) {
  const [f, setF] = useState({ name: lead?.name||"", email: lead?.email||"", phone: lead?.phone||"", level: lead?.level||"", message:"" });
  const [errs, setErrs] = useState({});
  const [submitted, setSubmitted] = useState(false);
  function handleChange(id, val) { setF(p=>({...p,[id]:val})); }
  function validate() {
    const e = {};
    if (!f.name.trim()) e.name = "Required";
    if (!f.email.includes("@")) e.email = "Enter a valid email";
    if (f.phone.replace(/\D/g,"").length < 10) e.phone = "Enter a valid phone";
    if (!f.level) e.level = "Please select";
    return e;
  }
  function submit() {
    const e = validate(); setErrs(e);
    if (Object.keys(e).length) return;
    fetch("/api/proxy", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"addToMailchimp", name:f.name, email:f.email, phone:f.phone, level:f.level, tags:["Tennis",`Invite Request - ${clinic.name}`] }) });
    fetch("/api/proxy", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"sendEmail", to:"jwlegacyrealty@gmail.com", subject:`New Clinic Invite Request — ${clinic.name}`, body:`Name: ${f.name}\nEmail: ${f.email}\nPhone: ${f.phone}\nLevel: ${f.level}\nMessage: ${f.message||"None"}` }) });
    setSubmitted(true);
  }
  if (submitted) return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"60px 24px",textAlign:"center"}}>
      <div style={{fontSize:56,marginBottom:16}}>🎾</div>
      <h1 style={{fontSize:24,fontWeight:800,color:"#0f172a",marginBottom:8}}>Request Sent!</h1>
      <p style={{color:"#64748b",marginBottom:24}}>Jeff will reach out about joining the {clinic.name}.</p>
      <PrimaryBtn full onClick={onBack}>Back to Home</PrimaryBtn>
    </div>
  );
  return (
    <div style={{maxWidth:480,margin:"0 auto"}}>
      <BackBtn onClick={onBack}/>
      <div style={{padding:"0 20px 32px"}}>
        <div style={{background:"#eff6ff",borderRadius:16,padding:"14px 16px",marginBottom:20}}>
          <div style={{fontWeight:700,fontSize:15,color:"#1d4ed8"}}>{clinic.emoji} {clinic.name}</div>
          <div style={{fontSize:13,color:"#3b82f6"}}>{clinic.day} · {clinic.time} · {clinic.level}</div>
        </div>
        <h1 style={{fontSize:20,fontWeight:800,color:"#0f172a",marginBottom:16}}>Request an Invite</h1>
        <FormField id="name" label="Full Name" placeholder="Jane Smith" value={f.name} onChange={handleChange} error={errs.name}/>
        <FormField id="email" label="Email" placeholder="jane@example.com" type="email" value={f.email} onChange={handleChange} error={errs.email}/>
        <FormField id="phone" label="Phone" placeholder="(352) 555-0100" type="tel" value={f.phone} onChange={handleChange} error={errs.phone}/>
        <FormSelect id="level" label="Skill Level" options={LEVELS} value={f.level} onChange={handleChange} error={errs.level}/>
        <div style={{marginBottom:20}}>
          <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:4}}>Anything else Jeff should know? (optional)</label>
          <textarea value={f.message} onChange={e=>setF(p=>({...p,message:e.target.value}))} placeholder="e.g. I played college tennis..."
            style={{width:"100%",padding:"11px 14px",borderRadius:12,border:"1.5px solid #e2e8f0",fontSize:14,outline:"none",boxSizing:"border-box",minHeight:80,resize:"vertical"}}/>
        </div>
        <PrimaryBtn full onClick={submit}>Send Request →</PrimaryBtn>
      </div>
    </div>
  );
}

// ── Date & Time ────────────────────────────────────────────────────────────
function DateTimeView({ service, onConfirm, onBack }) {
  const today = new Date();
  const [selDate, setSelDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selSlot, setSelSlot] = useState(null);
  const [err, setErr] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [recurringPreview, setRecurringPreview] = useState([]);
  const [loadingRecurring, setLoadingRecurring] = useState(false);
  const dates = Array.from({length:14},(_,i)=>{ const d=new Date(today); d.setDate(today.getDate()+i+1); return d; });

  async function pickDate(d) {
    setSelDate(d); setSelSlot(null); setLoading(true); setErr(""); setRecurring(false); setRecurringPreview([]);
    try {
      const busy = await fetchAvailability(fmtDate(d));
      const all = generateSlots(service.duration, d);
      setSlots(all.filter(sl => {
        const s=toMins(sl.value), e=s+service.duration;
        return !busy.some(b=>overlaps(s,e,toMins(b.start),toMins(b.end)));
      }));
    } catch {
      setErr("Couldn't load calendar. Showing all times.");
      setSlots(generateSlots(service.duration, d));
    }
    setLoading(false);
  }

  async function handleRecurringToggle(checked) {
    setRecurring(checked);
    if (!checked || !selSlot || !selDate) return;
    setLoadingRecurring(true);
    const weeks = [];
    for (let i = 1; i <= 7; i++) {
      const nextDate = addDays(selDate, i * 7);
      const dateStr = fmtDate(nextDate);
      const busy = await fetchAvailability(dateStr);
      const slotStart = toMins(selSlot.value);
      const slotEnd = slotStart + service.duration;
      const available = !busy.some(b => overlaps(slotStart, slotEnd, toMins(b.start), toMins(b.end)));
      weeks.push({ date: nextDate, dateStr, available });
    }
    setRecurringPreview(weeks);
    setLoadingRecurring(false);
  }

  return (
    <div style={{maxWidth:580,margin:"0 auto"}}>
      <BackBtn onClick={onBack}/>
      <div style={{padding:"0 20px 24px"}}>
        <h1 style={{fontSize:22,fontWeight:800,color:"#0f172a",marginBottom:4}}>Pick Date & Time</h1>
        <p style={{fontSize:13,color:"#64748b",marginBottom:20}}>{service.name} · {service.duration} min · ${service.price}</p>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8,marginBottom:24}}>
          {dates.map(d => {
            const active = selDate && fmtDate(selDate)===fmtDate(d);
            const day = d.getDay();
            const available = (day >= 1 && day <= 4) || day === 5 || day === 6;
            return (
              <button key={fmtDate(d)} onClick={()=>available&&pickDate(d)} style={{
                flexShrink:0, width:52, padding:"8px 0", borderRadius:14,
                border:`2px solid ${active?"#1d4ed8":"#e2e8f0"}`,
                background: active?"#1d4ed8":available?"#fff":"#f8fafc",
                color: active?"#fff":available?"#374151":"#cbd5e1",
                cursor:available?"pointer":"default", textAlign:"center"
              }}>
                <div style={{fontSize:10,fontWeight:600,opacity:.8}}>{d.toLocaleDateString("en-US",{weekday:"short"})}</div>
                <div style={{fontSize:20,fontWeight:800,lineHeight:1.2}}>{d.getDate()}</div>
                <div style={{fontSize:10,opacity:.7}}>{d.toLocaleDateString("en-US",{month:"short"})}</div>
              </button>
            );
          })}
        </div>
        {!selDate && <p style={{textAlign:"center",color:"#94a3b8",padding:"32px 0"}}>Select a date to see available times</p>}
        {loading && <div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:32,marginBottom:8}}>📅</div><p style={{color:"#94a3b8",fontSize:14}}>Checking your calendar…</p></div>}
        {!loading && selDate && (
          <>
            {err && <div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:10,padding:"8px 12px",fontSize:13,color:"#92400e",marginBottom:12}}>{err}</div>}
            {slots.length===0
              ? <p style={{textAlign:"center",color:"#94a3b8",padding:"32px 0"}}>No available times on this date. Try another day.</p>
              : <>
                  <h3 style={{fontSize:14,fontWeight:600,color:"#374151",marginBottom:12}}>
                    Available — {selDate.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
                  </h3>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:20}}>
                    {slots.map(s=>(
                      <button key={s.value} onClick={()=>setSelSlot(s)} style={{
                        padding:"10px 4px", borderRadius:12, fontSize:13, fontWeight:600, cursor:"pointer",
                        border:`2px solid ${selSlot?.value===s.value?"#1d4ed8":"#e2e8f0"}`,
                        background: selSlot?.value===s.value?"#1d4ed8":"#fff",
                        color: selSlot?.value===s.value?"#fff":"#374151"
                      }}>{s.label}</button>
                    ))}
                  </div>

                  {selSlot && (
                    <div style={{background:"#f8fafc",borderRadius:16,padding:"16px",marginBottom:20,border:"1px solid #e2e8f0"}}>
                      <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                        <input type="checkbox" checked={recurring} onChange={e=>handleRecurringToggle(e.target.checked)}
                          style={{width:18,height:18,cursor:"pointer"}}/>
                        <div>
                          <div style={{fontWeight:700,fontSize:14,color:"#0f172a"}}>Make this a weekly recurring session</div>
                          <div style={{fontSize:12,color:"#64748b"}}>Books the same time every week for 8 weeks</div>
                        </div>
                      </label>

                      {loadingRecurring && <p style={{fontSize:13,color:"#94a3b8",marginTop:12}}>Checking weekly availability…</p>}

                      {!loadingRecurring && recurringPreview.length > 0 && (
                        <div style={{marginTop:12}}>
                          <div style={{fontSize:12,fontWeight:600,color:"#374151",marginBottom:8}}>Weekly schedule preview:</div>
                          {recurringPreview.map((w,i) => (
                            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #e2e8f0",fontSize:13}}>
                              <span style={{color:"#374151"}}>{w.date.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
                              {w.available
                                ? <span style={{color:"#16a34a",fontWeight:600}}>✅ Available</span>
                                : <span style={{color:"#dc2626",fontWeight:600}}>❌ Not available — skipped</span>
                              }
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
            }
          </>
        )}
        <PrimaryBtn full disabled={!selSlot} onClick={()=>selSlot&&onConfirm(selDate, selSlot, recurring, recurringPreview)}>
          {selSlot ? `Continue · ${selSlot.label}${recurring?" (Weekly)":""}` : "Select a time to continue"}
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ── Checkout ───────────────────────────────────────────────────────────────
function CheckoutView({ service, date, slot, recurring, recurringDates, onConfirm, onBack, lead }) {
  const [f, setF] = useState({ name: lead?.name||"", email: lead?.email||"", phone: lead?.phone||"" });
  const [errs, setErrs] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const dateStr = date.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
  function handleChange(id, val) { setF(p=>({...p,[id]:val})); }
  function validate() {
    const e={};
    if(!f.name.trim()) e.name="Required";
    if(!f.email.includes("@")) e.email="Enter a valid email";
    if(f.phone.replace(/\D/g,"").length<10) e.phone="Enter a valid phone number";
    return e;
  }
  async function submit() {
    const e=validate(); setErrs(e);
    if(Object.keys(e).length) return;
    setSubmitting(true);
    await onConfirm({name:f.name,email:f.email,phone:f.phone});
    setSubmitting(false);
  }
  const availableRecurring = recurringDates?.filter(w=>w.available) || [];
  return (
    <div style={{maxWidth:480,margin:"0 auto"}}>
      <BackBtn onClick={onBack}/>
      <div style={{padding:"0 20px 32px"}}>
        <div style={{background:"#f8fafc",borderRadius:16,border:"1px solid #e2e8f0",padding:"16px",marginBottom:22}}>
          <h2 style={{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:10}}>Booking Summary</h2>
          {[["Coach","Jeff Williams"],["Session",service.name],["Date",dateStr],["Time",slot.label],["Duration",`${service.duration} min`]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0",borderBottom:"1px solid #e2e8f0"}}>
              <span style={{color:"#64748b"}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
            </div>
          ))}
          {recurring && availableRecurring.length > 0 && (
            <div style={{marginTop:8,padding:"8px 0",borderTop:"1px solid #e2e8f0"}}>
              <div style={{fontSize:12,color:"#1d4ed8",fontWeight:600}}>🔄 Weekly recurring — {availableRecurring.length + 1} sessions total</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:2}}>Total: ${service.price * (availableRecurring.length + 1)}</div>
            </div>
          )}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:18,fontWeight:800,padding:"10px 0 0",color:"#0f172a"}}>
            <span>Per session</span><span style={{color:"#1d4ed8"}}>${service.price}</span>
          </div>
        </div>
        <h2 style={{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:12}}>Your Information</h2>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
          <FormField id="name" label="Full Name" placeholder="Jane Smith" value={f.name} onChange={handleChange} error={errs.name}/>
          <FormField id="email" label="Email" placeholder="jane@example.com" type="email" value={f.email} onChange={handleChange} error={errs.email}/>
          <FormField id="phone" label="Phone" placeholder="(352) 555-0100" type="tel" value={f.phone} onChange={handleChange} error={errs.phone}/>
        </div>
        <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:12,padding:"14px 16px",fontSize:13,marginBottom:22}}>
          <div style={{fontWeight:700,color:"#15803d",marginBottom:4}}>💸 Payment via Venmo</div>
          <div style={{color:"#166534"}}>Please send <strong>${service.price}</strong> per session to <strong>@Jeff-Williams-504</strong> before each session.</div>
        </div>
        <PrimaryBtn full disabled={submitting} onClick={submit}>
          {submitting ? "Booking & adding to calendar…" : "Confirm Booking"}
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ── Confirmation ───────────────────────────────────────────────────────────
function ConfirmView({ service, date, slot, customer, recurring, bookedDates, onHome, onPortal }) {
  const dateStr = date.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
  return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"40px 24px",textAlign:"center"}}>
      <div style={{fontSize:60,marginBottom:12}}>🎾</div>
      <h1 style={{fontSize:26,fontWeight:800,color:"#0f172a",marginBottom:6}}>
        {recurring ? "Weekly sessions booked!" : "You're booked!"}
      </h1>
      <p style={{color:"#64748b",marginBottom:24}}>See you on the court! All sessions have been added to the calendar.</p>
      <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:20,padding:"20px",textAlign:"left",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <span style={{fontSize:18}}>✅</span>
          <span style={{fontWeight:700,color:"#15803d",fontSize:15}}>Booking Confirmed</span>
        </div>
        {[["Coach","Jeff Williams"],["Session",service.name],["First session",dateStr],["Time",slot.label],["Confirmation for",customer.email]].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"5px 0",borderBottom:"1px solid #dcfce7"}}>
            <span style={{color:"#64748b"}}>{k}</span><span style={{fontWeight:600,color:"#0f172a"}}>{v}</span>
          </div>
        ))}
        {recurring && bookedDates && (
          <div style={{marginTop:8,fontSize:12,color:"#15803d",fontWeight:600}}>
            🔄 {bookedDates.length} weekly sessions booked
          </div>
        )}
      </div>
      <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#1e40af",display:"flex",gap:8,marginBottom:16,textAlign:"left"}}>
        📅 Sessions added to Jeff's Google Calendar automatically.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <PrimaryBtn full onClick={onPortal}>View My Sessions</PrimaryBtn>
        <button onClick={onHome} style={{background:"none",border:"2px solid #e2e8f0",borderRadius:14,padding:"12px",fontSize:14,fontWeight:600,color:"#64748b",cursor:"pointer"}}>Book Another Session</button>
      </div>
    </div>
  );
}

// ── Client Portal ──────────────────────────────────────────────────────────
function ClientPortalView({ bookings, lead, onBack }) {
  const myBookings = bookings.filter(b => b.customer.email === lead?.email);
  const upcoming = myBookings.filter(b => new Date(b.date) >= new Date()).sort((a,b) => new Date(a.date) - new Date(b.date));
  const past = myBookings.filter(b => new Date(b.date) < new Date()).sort((a,b) => new Date(b.date) - new Date(a.date));

  function cancelSession(booking) {
    fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sendEmail",
        to: "jwlegacyrealty@gmail.com",
        subject: `Session Cancellation Request — ${booking.customer.name}`,
        body: `${booking.customer.name} has requested to cancel their session.\n\nSession: ${booking.service.name}\nDate: ${new Date(booking.date).toLocaleDateString()}\nTime: ${booking.slot.label}\nEmail: ${booking.customer.email}\nPhone: ${booking.customer.phone}`
      })
    });
    alert("Cancellation request sent! Jeff will confirm via email.");
  }

  return (
    <div style={{maxWidth:580,margin:"0 auto"}}>
      <BackBtn onClick={onBack}/>
      <div style={{padding:"0 20px 32px"}}>
        <h1 style={{fontSize:22,fontWeight:800,color:"#0f172a",marginBottom:4}}>My Sessions</h1>
        {lead?.name && <p style={{fontSize:13,color:"#64748b",marginBottom:20}}>{lead.name} · {lead.email}</p>}

        <h2 style={{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:12}}>Upcoming</h2>
        {upcoming.length === 0
          ? <div style={{background:"#f8fafc",borderRadius:16,padding:"24px",textAlign:"center",color:"#94a3b8",marginBottom:20}}>
              <div style={{fontSize:32,marginBottom:8}}>📅</div>
              <p style={{margin:0,fontSize:14}}>No upcoming sessions. Book one below!</p>
            </div>
          : upcoming.map((b,i) => (
            <div key={i} style={{background:"#fff",border:"2px solid #e2e8f0",borderRadius:16,padding:"16px",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15,color:"#0f172a"}}>{b.service.name}</div>
                  <div style={{fontSize:13,color:"#64748b",marginTop:2}}>{new Date(b.date).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
                  <div style={{fontSize:13,color:"#64748b"}}>{b.slot.label} · {b.service.duration} min</div>
                  <div style={{fontSize:13,color:"#1d4ed8",fontWeight:600,marginTop:4}}>${b.service.price} via Venmo @Jeff-Williams-504</div>
                </div>
                <button onClick={()=>cancelSession(b)} style={{background:"#fef2f2",border:"1px solid #fecaca",color:"#dc2626",borderRadius:10,padding:"6px 12px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                  Cancel
                </button>
              </div>
            </div>
          ))
        }

        {past.length > 0 && (
          <>
            <h2 style={{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:12,marginTop:8}}>Past Sessions</h2>
            {past.map((b,i) => (
              <div key={i} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:16,padding:"16px",marginBottom:12,opacity:.7}}>
                <div style={{fontWeight:600,fontSize:14,color:"#374151"}}>{b.service.name}</div>
                <div style={{fontSize:13,color:"#94a3b8"}}>{new Date(b.date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})} · {b.slot.label}</div>
              </div>
            ))}
          </>
        )}

        <div style={{marginTop:16}}>
          <PrimaryBtn full onClick={onBack}>Book Another Session</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function DashboardView({ bookings, leads, onBack }) {
  const [tab, setTab] = useState("bookings");
  const revenue = bookings.reduce((s,b)=>s+b.service.price,0);
  return (
    <div style={{maxWidth:600,margin:"0 auto"}}>
      <div style={{padding:"20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #e2e8f0"}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:"#0f172a",margin:0}}>Dashboard</h1>
          <p style={{fontSize:12,color:"#94a3b8",margin:"2px 0 0"}}>Jeff Williams Tennis</p>
        </div>
        <button onClick={onBack} style={{background:"none",border:"1px solid #e2e8f0",color:"#374151",padding:"7px 14px",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer"}}>← Back</button>
      </div>
      <div style={{padding:"20px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
          {[["📋","Bookings",bookings.length],["💰","Revenue",`$${revenue}`],["👥","Clients",leads.length]].map(([icon,label,val])=>(
            <div key={label} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:"16px 10px",textAlign:"center"}}>
              <div style={{fontSize:26,marginBottom:4}}>{icon}</div>
              <div style={{fontSize:22,fontWeight:800,color:"#0f172a"}}>{val}</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          {["bookings","clients"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:"8px 20px",borderRadius:20,fontWeight:600,fontSize:13,cursor:"pointer",
              background:tab===t?"#1d4ed8":"#fff", color:tab===t?"#fff":"#64748b",
              border:tab===t?"none":"1px solid #e2e8f0"
            }}>{t==="bookings"?"Bookings":"Clients"}</button>
          ))}
        </div>
        {tab==="bookings" && (
          bookings.length===0
            ? <div style={{textAlign:"center",padding:"48px 0",color:"#94a3b8"}}><div style={{fontSize:40,marginBottom:8}}>📭</div><p style={{margin:0,fontSize:14}}>No bookings yet.</p></div>
            : bookings.map((b,i)=>(
              <div key={i} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:14,marginBottom:10}}>
                <div style={{width:40,height:40,borderRadius:"50%",background:COACH.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:14,flexShrink:0}}>
                  {b.customer.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:"#0f172a"}}>{b.customer.name}</div>
                  <div style={{fontSize:13,color:"#64748b"}}>{b.service.name} · {b.service.duration} min</div>
                  <div style={{fontSize:12,color:"#94a3b8"}}>{new Date(b.date).toLocaleDateString()} at {b.slot.label}</div>
                </div>
                <div style={{fontWeight:800,fontSize:17,color:"#1d4ed8"}}>${b.service.price}</div>
              </div>
            ))
        )}
        {tab==="clients" && (
          leads.length===0
            ? <div style={{textAlign:"center",padding:"48px 0",color:"#94a3b8"}}><div style={{fontSize:40,marginBottom:8}}>👥</div><p style={{margin:0,fontSize:14}}>No clients yet.</p></div>
            : leads.map((l,i)=>(
              <div key={i} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"14px 16px",marginBottom:10}}>
                <div style={{fontWeight:700,color:"#0f172a",marginBottom:4}}>{l.name}</div>
                <div style={{fontSize:13,color:"#64748b"}}>{l.email} · {l.phone}</div>
                <div style={{display:"flex",gap:8,marginTop:6}}>
                  <span style={{background:"#eff6ff",color:"#1d4ed8",fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20}}>{l.level}</span>
                  <span style={{background:"#f0fdf4",color:"#15803d",fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20}}>{l.goal}</span>
                  <span style={{background:"#f8fafc",color:"#64748b",fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20}}>{bookings.filter(b=>b.customer.email===l.email).length} sessions</span>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const isAdmin = window.location.search.includes("admin=true");
  const [view, setView] = useState("welcome");
  const [lead, setLead] = useState(null);
  const [service, setService] = useState(null);
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [recurring, setRecurring] = useState(false);
  const [recurringDates, setRecurringDates] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [bookings, setBookings] = useState(() => { try { return JSON.parse(localStorage.getItem("cp_bookings")||"[]"); } catch { return []; } });
  const [leads, setLeads] = useState(() => { try { return JSON.parse(localStorage.getItem("cp_leads")||"[]"); } catch { return []; } });
  const [selectedClinic, setSelectedClinic] = useState(null);

  function saveLeads(newLeads) { setLeads(newLeads); try { localStorage.setItem("cp_leads", JSON.stringify(newLeads)); } catch {} }
  function saveBookings(newBookings) { setBookings(newBookings); try { localStorage.setItem("cp_bookings", JSON.stringify(newBookings)); } catch {} }

  async function handleEnter(info, isReturning) {
    setLead(info);
    if (!isReturning) {
      const existing = leads.find(l => l.email.toLowerCase() === info.email.toLowerCase());
      if (!existing) {
        saveLeads([...leads, info]);
        fetch("/api/proxy", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"addToMailchimp", name:info.name, email:info.email, phone:info.phone, level:info.level, goal:info.goal, tags:["Tennis"] }) });
      }
    }
    setView("portal");
  }

  async function handleCheckout(customerInfo) {
    await createCalendarEvent(service, fmtDate(date), slot.value, customerInfo);
    const allNewBookings = [{ service, date: fmtDate(date), slot, customer: customerInfo }];
    if (recurring && recurringDates.length > 0) {
      for (const w of recurringDates.filter(w => w.available)) {
        await createCalendarEvent(service, w.dateStr, slot.value, customerInfo);
        allNewBookings.push({ service, date: w.dateStr, slot, customer: customerInfo });
      }
    }
    setCustomer(customerInfo);
    saveBookings([...bookings, ...allNewBookings]);
    setView("confirm");
  }

  function handleClinicAction(clinic) {
    setSelectedClinic(clinic);
    setView(clinic.inviteOnly ? "requestinvite" : "clinicsignup");
  }

  function reset() { setService(null); setDate(null); setSlot(null); setRecurring(false); setRecurringDates([]); setCustomer(null); setView("home"); }

  return (
    <div style={{minHeight:"100vh",background:"#f8fafc",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      {view==="welcome"      && <WelcomeView onEnter={handleEnter} existingLeads={leads}/>}
      {view==="home"         && <HomeView onBook={s=>{setService(s);setView("datetime");}} onClinics={handleClinicAction} onDashboard={()=>setView("dashboard")} onPortal={()=>setView("portal")} lead={lead} isAdmin={isAdmin}/>}
      {view==="clinicsignup" && <ClinicSignUpView clinic={selectedClinic} onBack={()=>setView("home")} lead={lead}/>}
      {view==="requestinvite"&& <RequestInviteView clinic={selectedClinic} onBack={()=>setView("home")} lead={lead}/>}
      {view==="datetime"     && <DateTimeView service={service} onConfirm={(d,s,r,rd)=>{setDate(d);setSlot(s);setRecurring(r);setRecurringDates(rd||[]);setView("checkout");}} onBack={()=>setView("home")}/>}
      {view==="checkout"     && <CheckoutView service={service} date={date} slot={slot} recurring={recurring} recurringDates={recurringDates} onConfirm={handleCheckout} onBack={()=>setView("datetime")} lead={lead}/>}
      {view==="confirm"      && <ConfirmView service={service} date={date} slot={slot} customer={customer} recurring={recurring} bookedDates={recurringDates?.filter(w=>w.available)} onHome={reset} onPortal={()=>setView("portal")}/>}
      {view==="portal"       && <ClientPortalView bookings={bookings} lead={lead} onBack={()=>setView("home")} onBook={()=>setView("home")}/>}
      {view==="dashboard"    && <DashboardView bookings={bookings} leads={leads} onBack={()=>setView("home")}/>}
    </div>
  );
}
