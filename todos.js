/** @module todos */

const xss = require('xss');
const isISO8601 = require('validator/lib/isISO8601');
const { query } = require('./db');

/**
 * @typedef {object} TodoItem
 * @property {string} title Titill á item
 * @property {object} due Dagsetning þegar item á að klárast, má vera tómt
 * @property {string} position Röðun á item, heiltala > 0, má vera tómt
 * @property {string} completed Hvort item sé búið, má vera tómt
 */

/**
 * @typedef {object} Result
 * @property {boolean} success Hvort aðgerð hafi tekist
 * @property {boolean} notFound Hvort hlutur hafi fundist
 * @property {array} validation Fykli af villum, ef einhverjar
 * @property {TodoItem} item Todo item
 */

/**
 * Athugar hvort strengur sé "tómur", þ.e.a.s. `null`, `undefined`.
 *
 * @param {string} s Strengur til að athuga
 * @returns {boolean} `true` ef `s` er "tómt", annars `false`
 */
function isEmpty(s) {
  return s == null && !s;
}

/**
 * Staðfestir að todo item sé gilt. Ef verið er að breyta item sem nú þegar er
 * til, þá er `patching` sent inn sem `true`.
 *
 * @param {TodoItem} todo Todo item til að staðfesta
 * @param {boolean} [patching=false]
 * @returns {array} Fylki af villum sem komu upp, tómt ef engin villa
 */
function validate({ title, due, position, completed } = {}, patching = false) {
  const errors = [];

  if (!patching || !isEmpty(title)) {
    if (typeof title !== 'string' || title.length < 1 || title.length > 128) {
      errors.push({
        field: 'title',
        message: 'Titill verður að vera strengur sem er 1 til 128 stafir',
      });
    }
  }

  if (!isEmpty(due)) {
    if (typeof due !== 'string' || !isISO8601(due)) {
      errors.push({
        field: 'due',
        message: 'Dagsetning verður að vera gild ISO 8601 dagsetning',
      });
    }
  }

  if (!isEmpty(position)) {
    if (typeof position !== 'number' || Number(position) < 0) {
      errors.push({
        field: 'position',
        message: 'Staðsetning verður að vera heiltala stærri eða jöfn 0',
      });
    }
  }

  if (!isEmpty(completed)) {
    if (typeof completed !== 'boolean') {
      errors.push({
        field: 'completed',
        message: 'Lokið verður að vera boolean gildi',
      });
    }
  }

  return errors;
}

/**
 * Skilar lista af todo items. Geta verið röðuð, aðeins kláruð eða aðeins ekki
 * kláruð.
 *
 * @param {string} [order = 'asc'] Röðun á items, sjálfgefið í hækkandi röð. Ef
 *                                 `desc` er sent inn er raðað í lækkandi röð.
 * @param {boolean} [completed = undefined] Hvort birta eigi kláruð eða ekki
*                                  kláruð, getur verið tómt til að fá öll.
 * @returns {array} Fylki af todo items
 */
async function listTodos(order = 'asc', completed = undefined) {
  let result;

  const orderString = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  if (completed === 'false' || completed === 'true') {
    const completedAsBoolean = completed !== 'false';
    const q = `
    SELECT
      id, title, position, due, created, updated, completed
    FROM todos
    WHERE completed = $1
    ORDER BY position ${orderString}`;

    result = await query(q, [completedAsBoolean]);
  } else {
    const q = `
    SELECT
      id, title, position, due, created, updated, completed
    FROM todos
    ORDER BY position ${orderString}`;

    result = await query(q);
  }

  return result.rows;
}

/**
 * Sækir stakt todo item eftir auðkenni.
 *
 * @param {number} id Auðkenni á todo
 * @returns {object} Todo item eða null ef ekkert fannst
 */
async function readTodo(id) {
  const q = `
    SELECT
      id, title, position, due, created, updated, completed
    FROM
      todos
    WHERE id = $1`;

  let result = null;

  try {
    result = await query(q, [id]);
  } catch (e) {
    console.warn('Error fetching todo', e);
  }

  if (!result || result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Býr til todo item.
 *
 * @param {TodoItem} todo Todo item til að búa til.
 * @returns {Result} Niðurstaða þess að búa til item
 */
async function createTodo({ title, due, position } = {}) {
  const validation = validate({ title, due, position });

  if (validation.length > 0) {
    return {
      success: false,
      notFound: false,
      validation,
      item: null,
    };
  }

  const columns = [
    'title',
    due ? 'due' : null,
    position ? 'position' : null,
  ].filter(Boolean);

  const values = [
    xss(title),
    due ? xss(due) : null,
    position ? xss(position) : null,
  ].filter(Boolean);

  const params = values.map((_, i) => `$${i + 1}`);

  const sqlQuery = `
    INSERT INTO todos (${columns.join(',')})
    VALUES (${params})
    RETURNING id, title, position, due, created, updated, completed`;

  const result = await query(sqlQuery, values);

  return {
    success: true,
    notFound: false,
    validation: [],
    item: result.rows[0],
  };
}

/**
 * Uppfærir todo item.
 *
 * @param {Number} id Auðkenni á todo
 * @param {TodoItem} todo Todo item með gildum sem á að uppfæra
 * @returns {Result} Niðurstaða þess að búa til item
 */
async function updateTodo(id, { title, due, position, completed }) {
  const validation = validate({ title, due, position, completed }, true);

  if (validation.length > 0) {
    return {
      success: false,
      validation,
    };
  }

  const filteredValues = [
    xss(title),
    due ? xss(due) : null,
    position ? xss(position) : null,
  ]
    .filter(Boolean)
    .concat([
      completed != null ? Boolean(completed) : null,
    ]);

  const updates = [
    title ? 'title' : null,
    due ? 'due' : null,
    position ? 'position' : null,
    completed != null ? 'completed' : null,
  ]
    .filter(Boolean)
    .map((field, i) => `${field} = $${i + 2}`);

  const sqlQuery = `
    UPDATE todos
    SET ${updates} WHERE id = $1
    RETURNING id, title, position, due, created, updated, completed`;
  const values = [id, ...filteredValues];

  const result = await query(sqlQuery, values);

  if (result.rowCount === 0) {
    return {
      success: false,
      validation: [],
      notFound: true,
      item: null,
    };
  }

  return {
    success: true,
    validation: [],
    notFound: false,
    item: result.rows[0],
  };
}

async function deleteTodo(id) {
  const q = 'DELETE FROM todos WHERE id = $1';

  const result = await query(q, [id]);

  return result.rowCount === 1;
}

module.exports = {
  listTodos,
  createTodo,
  readTodo,
  updateTodo,
  deleteTodo,
};
