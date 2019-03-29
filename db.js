
const { Client } = require('pg');
const xss = require('xss');

/**
 * Execute an SQL query.
 *
 * @param {string} sqlQuery - SQL query to execute
 * @param {array} [values=[]] - Values for parameterized query
 *
 * @returns {Promise} Promise representing the result of the SQL query
 */
async function query(sqlQuery, values = []) {
  const connectionString = process.env.DATABASE_URL;

  const client = new Client({ connectionString });
  await client.connect();

  let result;

  try {
    result = await client.query(sqlQuery, values);
  } catch (err) {
    console.error('Error executing query', err);
    throw err;
  } finally {
    await client.end();
  }

  return result;
}

async function getAllOrdersUser() {
  const q = `
  SELECT id, user_id, name, address, created, updated
  FROM orders`;

  const result = await query(q);

  if (!result || result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function getOrdersUser(id) {
  const q = `
  SELECT id, user_id, name, address, created, updated
  FROM orders
  WHERE user_id = $1`;

  const result = await query(q, [id]);

  if (!result || result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function getCartUser(id) {
  const q = `
  SELECT id, product_id, quantity, total
  FROM productorders
  WHERE user_id = $1`;

  const result = await query(q, [id]);

  if (!result || result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function addToCart(product, quantity, userid) {
  const total = await query('SELECT price from products where id = $1', [product]);
  let { price } = total.rows[0];
  for (let i = 0; i < quantity; i += 1) {
    price += price;
  }

  const q = `
  INSERT INTO productorders (product_id, quantity, user_id, total)
  VALUES ($1, $2, $3, $4)
  RETURNING *`;


  const result = await query(q, [product, quantity, userid, price]);

  return result.rows[0];
}

module.exports = {
  query,
  getOrdersUser,
  getAllOrdersUser,
  addToCart,
  getCartUser,
};
