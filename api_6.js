const express = require('express');
const request = require('request');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = '1234';
const USER = 'ec32000001';
const PASS = 'CHalinee1234';
const LOGIN = 'https://efarmer.doae.go.th/login';
const TARGET = 'https://farmer.doae.go.th/farmer/index/1';

app.get('/search', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const id = req.query.id;
  const key = req.query.apikey;

  if (key !== API_KEY) return res.json({step:'Key',err:'ผิด'});
  if (!/^\d{13}$/.test(id)) return res.json({step:'ID',err:'ต้อง 13 หลัก'});

  const jar = request.jar();
  const hd = {
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Referer': LOGIN, 'Accept-Language':'th-TH,th;q=0.9'
  };

  request.get({url:LOGIN, headers:hd, jar, followAllRedirects:true, timeout:25000}, (e,r,b) => {
    if (e) return res.json({step:'เปิดล็อกอิน',err:e.message});
    if (!b || b.length<200) return res.json({step:'เปิดล็อกอิน',err:'ว่าง/สั้น'});
    const $ = cheerio.load(b);
    const csrf = $('meta[name="csrf-token"]').attr('content') || $('input[name="_token"]').val();
    if (!csrf) return res.json({step:'CSRF',err:'ไม่เจอ'});

    request.post({url:LOGIN, headers:hd, jar, form:{_token:csrf,username:USER,password:PASS}, followAllRedirects:true, timeout:25000}, (e,r,b) => {
      if (e) return res.json({step:'ส่งล็อกอิน',err:e.message});
      if (/คุณหลุดจากระบบ/i.test(b)) return res.json({step:'ล็อกอิน',err:'ไม่ผ่าน'});

      request.get({url:TARGET, headers:hd, jar, timeout:25000}, (e,r,b) => {
        if (e) return res.json({step:'ดึงเป้าหมาย',err:e.message});
        if (!b.includes(id)) return res.json({step:'ค้นหา',err:'ไม่พบ '+id});
        const found=[]; b.split(/<(li|p|div|tr|td)/).forEach(p=>{if(p.includes(id))found.push(p.replace(/<[^>]+>/g,' ').trim().slice(0,200))});
        res.json({ok:true,step:'เสร็จ',id,data:found});
      });
    });
  });
});

app.listen(PORT,()=>console.log('✅ รันพอร์ต',PORT));
