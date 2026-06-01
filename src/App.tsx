import { useState } from "react";

// ── Jeff's Profile ────────────────────────────────────────────────────────────
const COACH = {
  name: "Jeff Williams",
  sport: "Tennis",
  location: "Ocala, FL",
  avatar: "JW",
  color: "#1d4ed8",
  bio: "USPTA certified tennis pro with 15 years of teaching experience. Rated 4.5 and passionate about competitive development — Jeff has coached multiple students to ITF Gold achievements. Whether you're a beginner finding your footing or a competitive player chasing rankings, Jeff brings proven results and a player-first approach.",
  rating: 5.0,
  reviews: 47,
  services: [
    { id: "a", name: "Private Lesson",  duration: 60,  price: 70,  desc: "One-on-one instruction tailored to your game." },
    { id: "b", name: "Group Clinic",    duration: 90,  price: 105, desc: "Small group format — max 4 players." },
    { id: "c", name: "Match Play",      duration: 90,  price: 105, desc: "Supervised competitive play with coaching feedback." },
    { id: "d", name: "Tournament Prep", duration: 90,  price: 105, desc: "Strategy, mental game, and match-ready drills." },
  ]
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateSlots(durationMins) {
  const slots = [];
  for (let h = 7; h < 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h * 60 + m + durationMins > 20 * 60) continue;
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

// ── Small UI pieces ───────────────────────────────────────────────────────────
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

// ── Landing / Services ────────────────────────────────────────────────────────
function LandingView({ onBook, onDashboard }) {
  const [sel, setSel] = useState(null);
  return (
    <div>
      <div style={{background:"linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%)",padding:"36px 24px 32px",color:"#fff",position:"relative"}}>
        <button onClick={onDashboard} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,.15)",border:"none",color:"#fff",padding:"5px 14px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer"}}>
          Admin →
        </button>
        <div style={{fontSize:42,marginBottom:10}}>🎾</div>
        <h1 style={{fontSize:26,fontWeight:800,margin:"0 0 4px"}}>Jeff Williams Tennis</h1>
        <p style={{opacity:.8,margin:"0 0 14px",fontSize:14}}>Ocala, FL · Book a session</p>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Stars r={COACH.rating}/>
          <span style={{fontSize:13,opacity:.85}}>{COACH.rating} · {COACH.reviews} reviews</span>
        </div>
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
        <h2 style={{fontSize:17,fontWeight:700,color:"#0f172a",marginBottom:12}}>Choose a Session</h2>
        {COACH.services.map(s => (
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
      </div>
    </div>
  );
}

// ── Date & Time ───────────────────────────────────────────────────────────────
function DateTimeView({ service, onConfirm, onBack }) {
  const today = new Date();
  const [selDate, setSelDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selSlot, setSelSlot] = useState(null);
  const [err, setErr] = useState("");
  const dates = Array.from({length:14},(_,i)=>{ const d=new Date(today); d.setDate(today.getDate()+i+1); return d; });
  const fmt = d => d.toISOString().split("T")[0];

  async function pickDate(d) {
    setSelDate(d); setSelSlot(null); setLoading(true); setErr("");
    try {
      const busy = await fetchAvailability(fmt(d));
      const all = generateSlots(service.duration);
      setSlots(all.filter(sl => {
        const s=toMins(sl.value), e=s+service.duration;
        return !busy.some(b=>overlaps(s,e,toMins(b.start),toMins(b.end)));
      }));
    } catch {
      setErr("Couldn't load calendar. Showing all times.");
      setSlots(generateSlots(service.duration));
    }
    setLoading(false);
  }

  return (
    <div style={{maxWidth:580,margin:"0 auto"}}>
      <BackBtn onClick={onBack}/>
      <div style={{padding:"0 20px 24px"}}>
        <h1 style={{fontSize:22,fontWeight:800,color:"#0f172a",marginBottom:4}}>Pick Date & Time</h1>
        <p style={{fontSize:13,color:"#64748b",marginBottom:20}}>{service.name} · {service.duration} min · ${service.price}</p>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8,marginBottom:24}}>
          {dates.map(d => {
            const active = selDate && fmt(selDate)===fmt(d);
            return (
              <button key={fmt(d)} onClick={()=>pickDate(d)} style={{
                flexShrink:0, width:52, padding:"8px 0", borderRadius:14,
                border:`2px solid ${active?"#1d4ed8":"#e2e8f0"}`,
                background: active?"#1d4ed8":"#fff",
                color: active?"#fff":"#374151", cursor:"pointer", textAlign:"center"
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
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:24}}>
                    {slots.map(s=>(
                      <button key={s.value} onClick={()=>setSelSlot(s)} style={{
                        padding:"10px 4px", borderRadius:12, fontSize:13, fontWeight:600, cursor:"pointer",
                        border:`2px solid ${selSlot?.value===s.value?"#1d4ed8":"#e2e8f0"}`,
                        background: selSlot?.value===s.value?"#1d4ed8":"#fff",
                        color: selSlot?.value===s.value?"#fff":"#374151"
                      }}>{s.label}</button>
                    ))}
                  </div>
                </>
            }
          </>
        )}
        <PrimaryBtn full disabled={!selSlot} onClick={()=>selSlot&&onConfirm(selDate,selSlot)}>
          {selSlot ? `Continue · ${selSlot.label}` : "Select a time to continue"}
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ── Checkout ──────────────────────────────────────────────────────────────────
function CheckoutView({ service, date, slot, onConfirm, onBack }) {
  const [f, setF] = useState({name:"",email:"",phone:"",card:"",exp:"",cvv:""});
  const [errs, setErrs] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const dateStr = date.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});

  function validate() {
    const e={};
    if(!f.name.trim()) e.name="Required";
    if(!f.email.includes("@")) e.email="Enter a valid email";
    if(f.phone.replace(/\D/g,"").length<10) e.phone="Enter a valid phone number";
    if(f.card.replace(/\s/g,"").length<16) e.card="Enter a 16-digit card number";
    if(!f.exp.match(/^\d{2}\/\d{2}$/)) e.exp="MM/YY";
    if(f.cvv.length<3) e.cvv="3 digits";
    return e;
  }

  async function submit() {
    const e=validate(); setErrs(e);
    if(Object.keys(e).length) return;
    setSubmitting(true);
    await onConfirm({name:f.name,email:f.email,phone:f.phone});
    setSubmitting(false);
  }

  function Field({id,label,placeholder,type="text",maxLength,half}) {
    return (
      <div style={{flex:half?"1":"unset"}}>
        <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:4}}>{label}</label>
        <input type={type} placeholder={placeholder} maxLength={maxLength} value={f[id]}
          onChange={e=>setF(p=>({...p,[id]:e.target.value}))}
          style={{width:"100%",padding:"11px 14px",borderRadius:12,border:`1.5px solid ${errs[id]?"#f87171":"#e2e8f0"}`,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
        {errs[id] && <p style={{color:"#ef4444",fontSize:11,marginTop:3}}>{errs[id]}</p>}
      </div>
    );
  }

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
          <div style={{display:"flex",justifyContent:"space-between",fontSize:18,fontWeight:800,padding:"10px 0 0",color:"#0f172a"}}>
            <span>Total</span><span style={{color:"#1d4ed8"}}>${service.price}</span>
          </div>
        </div>
        <h2 style={{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:12}}>Your Information</h2>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
          <Field id="name" label="Full Name" placeholder="Jane Smith"/>
          <Field id="email" label="Email" placeholder="jane@example.com" type="email"/>
          <Field id="phone" label="Phone" placeholder="(352) 555-0100" type="tel"/>
        </div>
        <h2 style={{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:8}}>Payment</h2>
        <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"8px 12px",fontSize:12,color:"#1e40af",marginBottom:12,display:"flex",gap:6}}>
          🔒 Secure demo checkout — no real charge
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:22}}>
          <Field id="card" label="Card Number" placeholder="1234 5678 9012 3456" maxLength={19}/>
          <div style={{display:"flex",gap:12}}>
            <Field id="exp" label="Expiry" placeholder="MM/YY" maxLength={5} half/>
            <Field id="cvv" label="CVV" placeholder="123" maxLength={4} half/>
          </div>
        </div>
        <PrimaryBtn full disabled={submitting} onClick={submit}>
          {submitting ? "Booking & adding to calendar…" : `Pay $${service.price} & Confirm`}
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ── Confirmation ──────────────────────────────────────────────────────────────
function ConfirmView({ service, date, slot, customer, onHome }) {
  const dateStr = date.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
  return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"40px 24px",textAlign:"center"}}>
      <div style={{fontSize:60,marginBottom:12}}>🎾</div>
      <h1 style={{fontSize:26,fontWeight:800,color:"#0f172a",marginBottom:6}}>You're booked!</h1>
      <p style={{color:"#64748b",marginBottom:24}}>See you on the court. A calendar invite has been added automatically.</p>
      <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:20,padding:"20px",textAlign:"left",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <span style={{fontSize:18}}>✅</span>
          <span style={{fontWeight:700,color:"#15803d",fontSize:15}}>Booking Confirmed</span>
        </div>
        {[["Coach","Jeff Williams"],["Session",service.name],["Date",dateStr],["Time",slot.label],["Duration",`${service.duration} min`],["Total Paid",`$${service.price}`],["Confirmation for",customer.email]].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"5px 0",borderBottom:"1px solid #dcfce7"}}>
            <span style={{color:"#64748b"}}>{k}</span><span style={{fontWeight:600,color:"#0f172a"}}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#1e40af",display:"flex",gap:8,marginBottom:24,textAlign:"left"}}>
        📅 This session was added to Jeff's Google Calendar automatically.
      </div>
      <PrimaryBtn full onClick={onHome}>Book Another Session</PrimaryBtn>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardView({ bookings, onBack }) {
  const revenue = bookings.reduce((s,b)=>s+b.service.price,0);
  const upcoming = bookings.filter(b=>b.date>=new Date());
  return (
    <div style={{maxWidth:600,margin:"0 auto"}}>
      <div style={{padding:"20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #e2e8f0"}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,color:"#0f172a",margin:0}}>Dashboard</h1>
          <p style={{fontSize:12,color:"#94a3b8",margin:"2px 0 0"}}>Jeff Williams Tennis</p>
        </div>
        <button onClick={onBack} style={{background:"none",border:"1px solid #e2e8f0",color:"#374151",padding:"7px 14px",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer"}}>← Back to site</button>
      </div>
      <div style={{padding:"20px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:28}}>
          {[["📋","Bookings",bookings.length],["💰","Revenue",`$${revenue}`],["📅","Upcoming",upcoming.length]].map(([icon,label,val])=>(
            <div key={label} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:"16px 10px",textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
              <div style={{fontSize:26,marginBottom:4}}>{icon}</div>
              <div style={{fontSize:22,fontWeight:800,color:"#0f172a"}}>{val}</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>{label}</div>
            </div>
          ))}
        </div>
        <h2 style={{fontSize:15,fontWeight:700,color:"#0f172a",marginBottom:12}}>All Bookings</h2>
        {bookings.length===0
          ? <div style={{textAlign:"center",padding:"48px 0",color:"#94a3b8"}}>
              <div style={{fontSize:40,marginBottom:8}}>📭</div>
              <p style={{margin:0,fontSize:14}}>No bookings yet — they'll appear here once clients book.</p>
            </div>
          : bookings.map((b,i)=>(
            <div key={i} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:14,marginBottom:10}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:COACH.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:14,flexShrink:0}}>
                {b.customer.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:"#0f172a"}}>{b.customer.name}</div>
                <div style={{fontSize:13,color:"#64748b"}}>{b.service.name} · {b.service.duration} min</div>
                <div style={{fontSize:12,color:"#94a3b8"}}>{b.date.toLocaleDateString()} at {b.slot.label}</div>
              </div>
              <div style={{fontWeight:800,fontSize:17,color:"#1d4ed8"}}>${b.service.price}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("home");
  const [service, setService] = useState(null);
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [bookings, setBookings] = useState([]);

  async function handleCheckout(customerInfo) {
    await createCalendarEvent(service, date.toISOString().split("T")[0], slot.value, customerInfo);
    setCustomer(customerInfo);
    setBookings(b=>[...b,{service,date,slot,customer:customerInfo}]);
    setView("confirm");
  }
  function reset() { setService(null); setDate(null); setSlot(null); setCustomer(null); setView("home"); }

  return (
    <div style={{minHeight:"100vh",background:"#f8fafc",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      {view==="home"      && <LandingView   onBook={s=>{setService(s);setView("datetime");}} onDashboard={()=>setView("dashboard")}/>}
      {view==="datetime"  && <DateTimeView  service={service} onConfirm={(d,s)=>{setDate(d);setSlot(s);setView("checkout");}} onBack={()=>setView("home")}/>}
      {view==="checkout"  && <CheckoutView  service={service} date={date} slot={slot} onConfirm={handleCheckout} onBack={()=>setView("datetime")}/>}
      {view==="confirm"   && <ConfirmView   service={service} date={date} slot={slot} customer={customer} onHome={reset}/>}
      {view==="dashboard" && <DashboardView bookings={bookings} onBack={()=>setView("home")}/>}
    </div>
  );
}
