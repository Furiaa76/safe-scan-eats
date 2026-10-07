import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
Deno.serve(async(req)=>{
 const out=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method!=='POST')return out(405,{error:'method'});
 const key=req.headers.get('authorization')?.replace(/^Bearer /,'')??'';
 if(key.length<24||key.length>100)return out(401,{error:'unauthorized'});
 const db=createClient(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const admin=await db.from('app_statistics_admin').select('password_hash').eq('id',true).single();
 if(admin.error||admin.data?.password_hash!==digest)return out(401,{error:'unauthorized'});
 if(req.headers.get('content-type')!=='video/mp4')return out(400,{error:'type'});
 const len=Number(req.headers.get('content-length'));if(!len||len>45*1024*1024)return out(413,{error:'size'});
 const file=await req.arrayBuffer();if(file.byteLength>45*1024*1024||file.byteLength!==len)return out(413,{error:'size'});
 if(new TextDecoder().decode(file.slice(4,8))!=='ftyp')return out(400,{error:'invalid_mp4'});
 const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',file))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const bucket='safe-scan-promotional-videos';
 const check=await db.storage.getBucket(bucket);
 if(check.error){const create=await db.storage.createBucket(bucket,{public:true,allowedMimeTypes:['video/mp4'],fileSizeLimit:45*1024*1024});if(create.error)return out(503,{error:'bucket'});}
 const name=sha+'.mp4';
 const upload=await db.storage.from(bucket).upload(name,file,{contentType:'video/mp4',upsert:false,cacheControl:'31536000'});
 if(upload.error&&!(String(upload.error.statusCode)==='409'||/already exists|duplicate/i.test(upload.error.message)))return out(503,{error:upload.error.message});
 const url=db.storage.from(bucket).getPublicUrl(name).data.publicUrl;
 return out(200,{url,size:file.byteLength});
});