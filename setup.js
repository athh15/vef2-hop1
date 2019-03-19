require('dotenv').config();

const fs = require('fs');
const util = require('util');
const faker = require('faker');

const { query } = require('./db');

const connectionString = process.env.DATABASE_URL;

const readFileAsync = util.promisify(fs.readFile);

async function mock(n) {
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < n; i++) {
    const productName = faker.commerce.productName();
    const commercePrice = faker.commerce.price();
    const paragraph = faker.lorem.paragraph();
    const image = faker.image.image();

    const q = `
      INSERT INTO products (title, price, about, img)
      VALUES ($1, $2, $3, $4)`;

    await query(q, [productName, commercePrice, paragraph, image]);
  }
}

async function mock2(n) {
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < n; i++) {
    const department = faker.commerce.department();

    const q = `
      INSERT INTO categories (title)
      VALUES ($1)`;

    await query(q, [department]);
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

  await mock(1000);
  await mock2(12);

  console.info('Mock data inserted');
}

main().catch((err) => {
  console.error(err);
});
