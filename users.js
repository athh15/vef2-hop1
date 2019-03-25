const bcrypt = require('bcrypt');
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

async function query(q, values = []) {
  const client = new Client({ connectionString });
  await client.connect();

  let result;

  try {
    result = await client.query(q, values);
  } catch (err) {
    throw err;
  } finally {
    await client.end();
  }

  return result;
}

async function createUser(email, password) {
  const hashedPassword = await bcrypt.hash(password, 11);

  const q = `INSERT INTO users (email, password)
  VALUES ($1, $2)
  RETURNING *`;

  const result = await query(q, [email, hashedPassword]);

  return result.rows[0];
}

async function comparePasswords(hash, password) {
  const result = await bcrypt.compare(hash, password);

  return result;
}

async function findByEmail(email) {
  const q = 'SELECT * FROM users WHERE email = $1';

  const result = await query(q, [email]);

  if (result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}

async function getAllUsers() {
  const q = 'SELECT id,email,admin, created, updated FROM users';

  const result = await query(q);

  return result.rows;
}

async function updateUser(id, admin) {
  const q = `UPDATE users SET admin= $1
  WHERE id = $2
  RETURNING id, email, admin, created, updated`;

  const result = await query(q, [admin, id]);

  return result.rows[0];
}

async function findById(id) {
  const q = 'SELECT id,email,admin, created, updated FROM users WHERE id = $1';

  const result = await query(q, [id]);

  if (result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}

module.exports = {
  comparePasswords,
  findByEmail,
  findById,
  createUser,
  getAllUsers,
  updateUser,
};
