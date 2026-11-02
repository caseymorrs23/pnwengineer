// One-time migration for license banners, footers, SEO, and LocalBusiness schema.
return (async () => {
  const ignore=new Set([
    "index.html","service-areas.html","faq.html","contact.html","services.html","about-contact.html",
    "design-build-electrical-engineering.html","commercial-electrical-engineering.html",
    "multifamily-electrical-engineering.html","ev-charger-electrical-engineering.html",
    "electrical-load-calculations.html","pe-stamp-electrical-plans.html","service-upgrade-electrical-engineering.html",
    "generator-emergency-power-engineering.html","tenant-improvement-electrical-engineering.html",
    "panel-schedule-engineer.html","arc-flash-studies.html","projects.html","reviews.html",
    "areas/wyoming.html","areas/montana.html","areas/utah.html","areas/texas.html","areas/colorado.html"
  ]);
  const codes=["WA","OR","ID","NV","AZ","WY","MT","UT","TX","CO"];
  const names=["Washington","Oregon","Idaho","Nevada","Arizona","Wyoming","Montana","Utah","Texas","Colorado"];
  const nums=["55998","108239PE","428401","035802","87105","22329","121246","14317497-2202","163128","PE.0069669"];
  const header="PE licenses: "+codes.join(" • ");
  const footer="Casey Morris, P.E. | "+codes.map((s,i)=>s+" "+nums[i]).join(" • ");
  const allnames=names.slice(0,-1).join(", ")+", and Colorado";
  const allcodes="WA, OR, ID, NV, AZ, WY, MT, UT, TX, and CO";
  const old="WA PE #55998 • OR PE #108239PE • ID PE #428401 • NV PE #035802 • AZ PE #87105";
  const area=names.map(name=>({"@type":"AdministrativeArea",name}));
  const ids=codes.map((name,i)=>({"@type":"PropertyValue",name:name+" PE License",value:nums[i]}));
  function replaceRegions(s){
    return s
      .replace(/Washington, Oregon, Idaho, Nevada, and Arizona/g,allnames)
      .replace(/Washington, Oregon, Idaho, Nevada &amp; Arizona/g,allnames)
      .replace(/Washington, Oregon, Idaho, and Nevada/g,allnames)
      .replace(/WA,\s*OR,\s*ID,\s*NV,\s*(?:and\s*)?AZ\b/g,allcodes)
      .replace(/WA,\s*OR,\s*ID,\s*(?:and\s*)?NV\b/g,allcodes)
      .replace(/WA OR ID NV AZ/g,"10-State PE")
      .replace(/WA OR ID NV/g,"10-State PE");
  }
  function schema(o){
    if(Array.isArray(o)) return o.map(schema);
    if(!o||typeof o!=="object") return o;
    if(Array.isArray(o.areaServed)&&o.areaServed.length>=4&&o.areaServed.every(x=>x&&names.slice(0,5).includes(x.name)))o.areaServed=area;
    if(Array.isArray(o.identifier)&&o.identifier.some(x=>x&&x.value==="55998"))o.identifier=ids;
    if(typeof o.description==="string")o.description=replaceRegions(o.description);
    for(const k of Object.keys(o))if(k!=="areaServed"&&k!=="identifier"&&k!=="description"&&o[k]&&typeof o[k]==="object")o[k]=schema(o[k]);
    return o;
  }
  function change(c){
    c=c.replace(/(<span\b[^>]*class=["']license-line["'][^>]*>)[\s\S]*?(<\/span>)/g,(_,a,b)=>a+header+b);
    c=c.replace(/(<div\b[^>]*class=["']footer-licenses["'][^>]*>)[\s\S]*?(<\/div>)/g,(_,a,b)=>a+footer+b);
    c=c.replaceAll(old,"Casey Morris, P.E. • PE licensed in 10 states");
    c=replaceRegions(c);
    c=c.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g,(all,body)=>{
      try{return all.slice(0,all.indexOf(">")+1)+JSON.stringify(schema(JSON.parse(body)))+"</script>";}catch(e){return all;}
    });
    return c;
  }
  const t=await tools.mcp__GitHub__fetch({url:"https://api.github.com/repos/"+repo+"/git/trees/main?recursive=1"});
  const candidates=JSON.parse(t.result.content).tree.filter(x=>x.type==="blob"&&x.path.endsWith(".html")&&!ignore.has(x.path)).map(x=>x.path).sort();
  const size=15,sub=candidates.slice(index*size,(index+1)*size);
  if(!sub.length)return {done:true,batch:index,total:candidates.length,sha:base};
  const entries=(await Promise.all(sub.map(async path=>{
    const obj=await tools.mcp__GitHub__fetch_file({repository_full_name:repo,path});
    const after=change(obj.result.content);
    return after===obj.result.content?null:{path,mode:"100644",type:"blob",content:after};
  }))).filter(Boolean);
  if(!entries.length)return {done:false,batch:index,total:candidates.length,sha:base,changed:0};
  const newTree=await tools.mcp__GitHub__create_tree({repository_full_name:repo,base_tree_sha:base,tree_elements:entries});
  return {done:(index+1)*size>=candidates.length,batch:index,total:candidates.length,sha:newTree.result.sha,changed:entries.length,first:sub[0],last:sub[sub.length-1]};
})();