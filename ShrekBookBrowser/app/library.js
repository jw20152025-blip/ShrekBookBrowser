const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
function createLibraryStore(userData){
 const root=path.join(userData,'library'), bookmarks=path.join(root,'bookmarks.json'), cards=path.join(root,'knowledge-cards.json');
 const read=f=>{try{const x=JSON.parse(fs.readFileSync(f,'utf8'));return Array.isArray(x)?x:[]}catch{return[]}};
 const write=(f,x)=>{fs.mkdirSync(root,{recursive:true});const tmp=f+'.tmp';fs.writeFileSync(tmp,JSON.stringify(x,null,2),'utf8');fs.renameSync(tmp,f)};
 function clean(x){const u=new URL(String(x&&x.url||''));if(!['http:','https:'].includes(u.protocol))throw Error('Only HTTP and HTTPS sources can be saved.');return{title:String(x.title||u.hostname).slice(0,300),url:u.toString(),domain:String(x.domain||u.hostname).slice(0,200),description:String(x.description||'').slice(0,1800),snippet:String(x.snippet||'').slice(0,1800),tags:Array.isArray(x.tags)?x.tags.slice(0,12).map(v=>String(v).slice(0,48)):[],summary:String(x.summary||'').slice(0,6000),score:Number(x.score)||0}}
 const list=()=>({bookmarks:read(bookmarks),cards:read(cards)});
 function save(file,x){const e=clean(x),items=read(file),old=items.find(v=>v.url===e.url);if(old)Object.assign(old,e,{updatedAt:new Date().toISOString()});else items.unshift({id:crypto.randomUUID(),...e,savedAt:new Date().toISOString()});write(file,items.slice(0,1000));return list()}
 function remove(file,id){write(file,read(file).filter(x=>x.id!==String(id)));return list()}
 return{list,saveBookmark:x=>save(bookmarks,x),removeBookmark:id=>remove(bookmarks,id),saveCard:x=>save(cards,x),removeCard:id=>remove(cards,id)};
}
module.exports={createLibraryStore};
