require('dotenv').config();

const fs = require('fs');
const util = require('util');
const faker = require('faker');
const cloudinary = require('cloudinary');

const { query } = require('./db');

const connectionString = process.env.DATABASE_URL;

const readFileAsync = util.promisify(fs.readFile);

async function mock(n) {
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < n; i++) {
    const department = faker.commerce.department();

    const q = `
      INSERT INTO categories (title)
      VALUES ($1)`;

    await query(q, [department]);
  }
}

cloudinary.config({
  cloud_name: 'flottsky',
  api_key: '985742898674683',
  api_secret: 'VO4tH7jqqxtHRsaPclgyVuvx7To',
});

async function mock2(n) {
  // eslint-disable-next-line no-plusplus
  //sækjs categorirs  geyma id-in i fylki or sum

  const ids = await query('SELECT id FROM categories');

  const idsarr = ids.rows;

  for (let i = 0; i < n; i += 1) {
    const t = Math.floor(Math.random() * 20) + 1;
    const productName = faker.commerce.productName();
    const commercePrice = faker.commerce.price();
    const paragraph = faker.lorem.paragraph();
    // const image = faker.image.image();
    // console.log("fokk");
    const CLOUDINARY_URL = cloudinary.image('img' + i.toString());
    // console.log(CLOUDINARY_URL);
    const image = CLOUDINARY_URL.substring(10, CLOUDINARY_URL.length - 4);
    const category = Math.floor(Math.random() * idsarr.length + 1);

    const q = `
      INSERT INTO products (title, price, about, img, category_id)
      VALUES ($1, $2, $3, $4, $5)`;

    await query(q, [productName, commercePrice, paragraph, image, category]);
  }
}

async function main() {
  console.info(`Set upp gagnagrunn á ${connectionString}`);
  // droppa töflum ef til
  await query('DROP TABLE IF EXISTS categories, products, users, orders, productorders,todos');
  console.info('Töflum eytt');

  // búa til töflur út frá skema
  try {
    const createTable = await readFileAsync('./schema.sql');
    await query(createTable.toString('utf8'));
    console.info('Töflur búnar til');
  } catch (e) {
    console.error('Villa við að búa til töflur:', e.message);
    return;
  }

  // bæta færslum við töflur
  try {
    const insert = await readFileAsync('./insert.sql');
    await query(insert.toString('utf8'));
    console.info('Gögnum bætt við');
  } catch (e) {
    console.error('Villa við að bæta gögnum við:', e.message);
  }


  await mock(12);
  await mock2(100);

  console.info('Mock data inserted');
}

main().catch((err) => {
  console.error(err);
});
