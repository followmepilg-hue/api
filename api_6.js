const express = require('express');
const request = require('request');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = 'A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6';
const LOGIN_URL = 'https://efarmer.doae.go.th/login';
const TARGET_URL = 'https://farmer.doae.go.th/farmer/index/1';
const SYS_USER = 'ec32000001';
const SYS_PASS = 'CHalinee1234';
const follow = { followAllRedirects: true, maxRedirects: 15 };

function searchByID(id, cb) {
  const jar = request.jar();
  const hd = {
    'User-Agent':'Mozilla/5.0 Chrome/120 Safari/537.36',
    'Referer': LOGIN_URL, 'Accept-Language':'th-TH,th;q=0.9'
  };
  request.get({url:LOGIN_URL, headers:hd, jar, ...follow}, (e,r,b) => {
    if (e||!b) return cb({ok:false,err:'เปิดล็อกอินไม่ได้'});
    const $ = cheerio.load(b);
    let csrf = $('meta[name="csrf-token"]').attr('content') || $('input[name="_token"]').val();
    if (!csrf) return cb({ok:false,err:'หา CSRF ไม่เจอ'});
    let uF='username', pF='password';
    const ui=$('input[type="text"],input[placeholder*="ชื่อ"]').first();
    const pi=$('input[type="password"]').first();
    if (ui.length) uF=ui.attr('name');
    if (pi.length) pF=pi.attr('name');
    const form={_token:csrf}; form[uF]=SYS_USER; form[pF]=SYS_PASS;
    request.post({url:LOGIN_URL, headers:hd, jar, form, ...follow}, (e,r,b) => {
      if (e) return cb({ok:false,err:'ส่งล็อกอินผิด'});
      if (/คุณหลุดจากระบบ/i.test(b)) return cb({ok:false,err:'ล็อกอินไม่ผ่าน'});
      request.get({url:TARGET_URL, headers:hd, jar, ...follow}, (e,r,b) => {
        if (e||!b||b.length<300) return cb({ok:false,err:'ดึงหน้าเป้าหมายไม่ได้'});
        if (!b.includes(id)) return cb({ok:false,err:'ไม่พบข้อมูล '+id});
        const found=[]; b.split(/<(li|p|div|tr|td)/).forEach(p=>{if(p.includes(id))found.push(p.replace(/<[^>]+>/g,'').trim().slice(0,200))});
        cb({ok:true,idCard:id,found,total:found.length});
      });
    });
  });
}

function checkKey(req,res,next){
  const k=req.headers['x-api-key']||req.query.apikey;
  if(!k||k!==API_KEY)return res.status(403).json({ok:false,err:'❌ API Key ผิด'});
  next();
}

app.get('/ค้น', checkKey, (req,res)=>{
  const id=req.query.id;
  if(!/^\d{13}$/.test(id))return res.json({ok:false,err:'⚠️ ใช้: ?id=1234567890123&apikey='+API_KEY});
  searchByID(id, r=>res.json(r));
});

app.listen(PORT,()=>console.log('✅ รันพอร์ต',PORT));
