const express = require('express');
let cloudinary = require('cloudinary');

const router = express.Router();

cloudinary.config({
  cloud_name: 'flottsky',
  api_key: '985742898674683',
  api_secret: 'VO4tH7jqqxtHRsaPclgyVuvx7To',
});

for (let i = 1; i <= 20; i += 1) {
  cloudinary.v2.uploader.upload(__dirname + '/' + "img" + '/' + "img" + i.toString() + ".jpg",
    { public_id: "img" + i.toString() },
    (error, result) => { console.log(result, error); })
}
