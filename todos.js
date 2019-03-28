/** @module todos */

const xss = require('xss');
const { query } = require('./db');

/**
 * @typedef {object} TodoItem
 * @property {string} title Titill á item
 * @property {object} due Dagsetning þegar item á að klárast, má vera tómt
 * @property {string} position Röðun á item, heiltala > 0, má vera tómt
 * @property {string} completed Hvort item sé búið, má vera tómt
 */

/**
 * @typedef {object} CategoryItem
 * @property {string} title Titill á item
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
function validate({
  categoryId, title, price, about, img,
} = {}, patching = false, category = false) {
  const errors = [];

  if (!patching || !isEmpty(title)) {
    if (typeof title !== 'string' || title.length < 1 || title.length > 128) {
      errors.push({
        field: 'title',
        message: 'Titill verður að vera strengur sem er 1 til 128 stafir',
      });
    }
  }
  if (category) {
    if (!patching || !isEmpty(categoryId)) {
      if (typeof categoryId !== 'number' || Number(categoryId) < 0) {
        errors.push({
          field: 'categoryId',
          message: 'Flokkur verður að vera tala og stærri eða jöfn 0',
        });
      }
    }

    if (!patching || !isEmpty(price)) {
      if (typeof price !== 'number' || Number(price) < 0) {
        errors.push({
          field: 'price',
          message: 'Verð verður að vera tala og stærri eða jöfn 0',
        });
      }
    }

    if (!patching || !isEmpty(about)) {
      if (typeof about !== 'string' || title.length < 1) {
        errors.push({
          field: 'about',
          message: 'Umföllun verður að vera strengur sem er ekki tómur',
        });
      }
    }

    if (typeof img !== 'string') {
      errors.push({
        field: 'img',
        message: 'Verður að vera strengur',
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
async function listTodos(order = 'desc', category = '', search = '') {
  let result;
  const orderString = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  console.log('search:', search, 'category:', category, 'bæði:', search && category);
  if (search && category) {
    // str.includes("world");
    // WHERE category = $1
    console.log('1');
    const q = `
    SELECT
      products.id, category_id, products.title, price, about, img, created, categories.title AS cat
    FROM products,categories
    WHERE categories.title = $1
    AND categories.id = category_id
    AND products.title LIKE '%' || $2 || '%'
    OR about LIKE '%' || $2 || '%'
    ORDER BY created ${orderString}`;
    result = await query(q, [category, search]);
  } else if (category) {
    console.log('2');
    // WHERE category = $1
    const q = `
    SELECT
      id, category_id, title, price, about, img, created
    FROM products
    WHERE category_id = $1
    ORDER BY created ${orderString}`;
    result = await query(q, [category]);
  } else if (search) {
    console.log('3');
    const q = `
    SELECT
      id, category_id, title, price, about, img, created
    FROM products
    where title like '%' || $1 || '%'
    OR about like '%' || $1 || '%'
    ORDER BY created ${orderString}`;
    result = await query(q, [search]);
  } else {
    console.log('4');
    const q = `
    SELECT
      id, category_id, title, price, about, img, created
    FROM products
    ORDER BY created ${orderString}`;
    result = await query(q);
  }

  return result.rows;
}

async function listCategories() {
  const result = await query('SELECT * FROM categories');
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
      id, title, price, about, img, created
    FROM
      products
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
async function createTodo({
  categoryId, title, price, about, img,
} = {}) {
  const validation = validate({
    categoryId, title, price, about, img,
  });

  if (validation.length > 0) {
    return {
      success: false,
      notFound: false,
      validation,
      item: null,
    };
  }

  const columns = [
    'category_id',
    'title',
    price ? 'price' : null,
    about ? 'about' : null,
    img ? 'img' : null,
  ].filter(Boolean);

  const values = [
    xss(categoryId),
    xss(title),
    price ? xss(price) : null,
    about ? xss(about) : null,
    img ? xss(img) : null,
  ].filter(Boolean);

  const params = values.map((_, i) => `$${i + 1}`);

  const sqlQuery = `
    INSERT INTO products (${columns.join(',')})
    VALUES (${params})
    RETURNING id, title, price, about, img`;
  const result = await query(sqlQuery, values);

  return {
    success: true,
    notFound: false,
    validation: [],
    item: result.rows[0],
  };
}

/**
 * Býr til todo item.
 *
 * @param {CategoryItem} category Category item til að búa til.
 * @returns {Result} Niðurstaða þess að búa til item
 */
async function createCategory({
  title,
} = {}) {
  const validation = validate({ title, category: true });
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
  ].filter(Boolean);

  const values = [
    xss(title),
  ].filter(Boolean);

  const params = values.map((_, i) => `$${i + 1}`);

  const sqlQuery = `
    INSERT INTO categories (${columns.join(',')})
    VALUES (${params})
    RETURNING id, title`;
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
async function updateTodo(id, {
  title, price, about, img,
}) {
  const validation = validate({
    title, price, about, img,
  }, true);

  if (validation.length > 0) {
    return {
      success: false,
      validation,
    };
  }

  const filteredValues = [
    xss(title),
    price ? xss(price) : null,
    about ? xss(about) : null,
    img ? xss(img) : null,
  ]
    .filter(Boolean)
    .concat([
      // completed != null ? Boolean(completed) : null,
    ]);

  const updates = [
    title ? 'title' : null,
    price ? 'price' : null,
    about ? 'about' : null,
    img != null ? 'img' : null,
  ]
    .filter(Boolean)
    .map((field, i) => `${field} = $${i + 2}`);

  const sqlQuery = `
    UPDATE products
    SET ${updates} WHERE id = $1
    RETURNING id, title, price, about, img`;
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

/**
 * Uppfærir category item.
 *
 * @param {Number} id Auðkenni á category
 * @param {CategoryItem} category Category item með gildum sem á að uppfæra
 * @returns {Result} Niðurstaða þess að búa til item
 */
async function updateCategory(id, {
  title,
}) {
  const validation = validate({
    title,
  }, true);

  if (validation.length > 0) {
    return {
      success: false,
      validation,
    };
  }

  const filteredValues = [
    xss(title),
  ]
    .filter(Boolean)
    .concat([
      // completed != null ? Boolean(completed) : null,
    ]);

  const updates = [
    title ? 'title' : null,
  ]
    .filter(Boolean)
    .map((field, i) => `${field} = $${i + 2}`);

  const sqlQuery = `
    UPDATE categories
    SET ${updates} WHERE id = $1
    RETURNING id, title`;
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

/**
 * @param  {number} id Auðkenni fyrir todo sem á að eyða.
 */
async function deleteTodo(id) {
  const q = 'DELETE FROM products WHERE id = $1';

  const result = await query(q, [id]);

  return result.rowCount === 1;
}

/**
 * Eyðir category item
 *
 * @param  {number} id Auðkenni fyrir category sem á að eyða.
 *
 */
async function deleteCategory(id) {
  const q = 'DELETE FROM categories WHERE id = $1';

  const result = await query(q, [id]);

  return result.rowCount === 1;
}

module.exports = {
  listTodos,
  listCategories,
  createTodo,
  createCategory,
  readTodo,
  updateTodo,
  updateCategory,
  deleteTodo,
  deleteCategory,
};
