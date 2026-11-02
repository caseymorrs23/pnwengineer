(()=>{
"use strict";
const test=new URLSearchParams(location.search).get("intake_test")==="1";
const page=location.pathname;
const key="pnw_verified_lead";
if(page.endsWith("/thanks.html")){
 let ok=null;
 try{ok=JSON.parse(sessionStorage.getItem(key)||"null")}catch(_){}
 const age=Date.now()-Number(ok?.at||0);
 if(ok&&/^[a-f0-9]{32}$/.test(ok.token)&&age>=0&&age<900000){
  try{sessionStorage.removeItem(key)}catch(_){}
  window.dataLayer=window.dataLayer||[];
  window.dataLayer.push({event:"pnw_lead_form_confirmation",form_name:"quote_request",lead_status:"saved"});
 }
 return;
}
const form=document.getElementById("quote-form");
if(!form||!test)return; // Existing PNW forms stay live on the original endpoint.
const frame=document.createElement("iframe");
frame.name="pnw-verified-lead-frame";
frame.setAttribute("aria-hidden","true");
frame.title="Lead confirmation";
frame.style.cssText="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;border:0";
document.body.appendChild(frame);
let token="",acknowledged=false;
let msg=document.createElement("p");
msg.setAttribute("role","status");msg.setAttribute("aria-live","polite");
msg.textContent="Verified PNW intake test: this submission creates a real row in the shared Google Sheet.";
form.appendChild(msg);
window.addEventListener("message",ev=>{
 const data=ev.data;
 const google=ev.origin==="null"||ev.origin==="https://script.google.com"||
  /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com$/i.test(ev.origin);
 if(!google||!data||typeof data!=="object"||
 data.source!=="pnw-gas-intake"||data.status!=="saved"||!token||data.token!==token||acknowledged)return;
 acknowledged=true;
 try{sessionStorage.setItem(key,JSON.stringify({token,at:Date.now()}))}catch(_){}
 location.assign("/thanks.html");
});
form.addEventListener("submit",ev=>{
 if(!crypto||!crypto.getRandomValues){ev.preventDefault();msg.textContent="Secure browser support is required.";return;}
 const random=new Uint8Array(16);crypto.getRandomValues(random);
 token=Array.from(random,b=>b.toString(16).padStart(2,"0")).join("");
 acknowledged=false;
 let id=form.querySelector('input[name="submission_id"]');
 if(!id){id=document.createElement("input");id.name="submission_id";id.type="hidden";form.appendChild(id);}
 id.value=token;
 const params=new URLSearchParams(location.search);
 for(const name of ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"]){
  let field=form.querySelector('input[name="'+name+'"]');
  if(!field){field=document.createElement("input");field.type="hidden";field.name=name;form.appendChild(field);}
  field.value=params.get(name)||"";
 }
 form.action="https://script.google.com/macros/s/AKfycbyzoTmhY30MNzPnFrC6DuP9GEuZZdUHW3nsk6rYPwORkaq8-mszZd9s9yS-yVhkkDRQlw/exec";
 form.target=frame.name;
 const button=form.querySelector('[type="submit"]');
 if(button){button.disabled=true;button.textContent="Submitting…"}
 msg.textContent="Submitting and verifying the Google Sheet save…";
 const t=token;
 setTimeout(()=>{
  if(acknowledged||t!==token)return;
  msg.textContent="No verified confirmation was received. Check the sheet before retrying, to avoid duplicate leads.";
  if(button){button.disabled=false;button.textContent="Retry request"}
 },20000);
 window.dataLayer=window.dataLayer||[];
 window.dataLayer.push({event:"pnw_form_submit_attempt"});
});
})();