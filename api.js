/** @module api */

const express = require('express');

const {
  listTodos,
  listCategories,
  createTodo,
  createCategory,
  readTodo,
  updateTodo,
  updateCategory,
  deleteTodo,
  deleteCategory,
} = require('./todos');

const auth = require('./authentication');

const router = express.Router();

const {
  PORT: port = 3000,

} = process.env;

/**
 * Higher-order fall sem umlykur async middleware með villumeðhöndlun.
 *
 * @param {function} fn Middleware sem grípa á villur fyrir
 * @returns {function} Middleware með villumeðhöndlun
 */
function catchErrors(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

/**
 * Route handler fyrir lista af todods gegnum GET.
 *
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 * @returns {array} Fylki af todos
 */
async function listRoute(req, res) {
  const {
    category, search,
  } = req.query;

  let { offset = 0, limit = 10 } = req.query;

  offset = Number(offset);
  limit = Number(limit);

  const rows = await listTodos(category, search, offset, limit);

  const result = {
    links: {
      self: {
        href: `http://localhost:${port}/?offset=${offset}&limit=${limit}`,
      },
    },
    items: rows,
  };

  if (offset > 0) {
    result.links.prev = {
      href: `http://localhost:${port}/?offset=${offset - limit}&limit=${limit}`,
    };
  }

  if (rows.length <= limit) {
    result.links.next = {
      href: `http://localhost:${port}/?offset=${Number(offset) + limit}&limit=${limit}`,
    };
  }

  res.json(result);
}

/**
 * Route handler fyrir lista af categories gegnum GET.
 *
 * @param  {object} req Request hlutur
 * @param  {object} res Response hlutur
 */
async function listCategoriesRoute(req, res) {
  const items = await listCategories();

  return res.json(items);
}

/**
 * Route handler til að búa til todo gegnum POST.
 *
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 * @returns {object} Todo sem búið var til eða villur
 */
async function createRoute(req, res) {
  const {
    categoryId,
    title,
    price,
    about,
    img,
  } = req.body;

  const result = await createTodo({
    categoryId,
    title,
    price,
    about,
    img,
  });

  if (!result.success) {
    return res.status(400).json(result.validation);
  }

  return res.status(201).json(result.item);
}

async function createCategoryRoute(req, res) {
  const {
    title,
  } = req.body;

  const result = await createCategory({
    title,
  });

  if (!result.success) {
    return res.status(400).json(result.validation);
  }

  return res.status(201).json(result.item);
}

/**
 * Route handler fyrir stakt todo gegnum GET.
 *
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 * @returns {object} Todo eða villa
 */
async function todoRoute(req, res) {
  const { id } = req.params;

  const todo = await readTodo(id);

  if (todo) {
    return res.status(200).json(todo);
  }

  return res.status(404).json({ error: 'Item not found' });
}

/**
 * Route handler til að breyta todo gegnum PATCH.
 *
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 * @returns {object} Breytt todo eða villa
 */
async function patchRoute(req, res) {
  const { id } = req.params;
  const {
    title, price, about, img,
  } = req.body;
  const item = {
    title, price, about, img,
  };

  const result = await updateTodo(id, item);

  if (!result.success && result.validation.length > 0) {
    return res.status(400).json(result.validation);
  }

  if (!result.success && result.notFound) {
    return res.status(404).json({ error: 'Item not found' });
  }

  return res.status(201).json(result.item);
}

/**
 * Route handler til að breyta Category gegnum PATCH.
 *
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 * @returns {object} Breytt category eða villa
 */
async function patchCategoryRoute(req, res) {
  const { id } = req.params;
  const {
    title,
  } = req.body;
  const item = {
    title,
  };

  const result = await updateCategory(id, item);

  if (!result.success && result.validation.length > 0) {
    return res.status(400).json(result.validation);
  }

  if (!result.success && result.notFound) {
    return res.status(404).json({ error: 'Item not found' });
  }

  return res.status(201).json(result.item);
}

/**
 * Route handler til að eyða todo gegnum DELETE.
 *
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 * @returns {object} Engu ef eytt, annars villu
 */
async function deleteRoute(req, res) {
  const { id } = req.params;

  const deleted = await deleteTodo(id);

  if (deleted) {
    return res.status(204).json({});
  }

  return res.status(404).json({ error: 'Item not found' });
}

/**
 * Route handler til að eyða category gegnum DELETE.
 *
 * @param {object} req Request hlutur
 * @param {object} res Response hlutur
 * @returns {object} Engu ef eytt, annars villu
 */
async function deleteCategoryRoute(req, res) {
  const { id } = req.params;

  const deleted = await deleteCategory(id);

  if (deleted) {
    return res.status(204).json({});
  }

  return res.status(404).json({ error: 'Item not found' });
}

router.get('/products', catchErrors(listRoute));
router.get('/products/:id', catchErrors(todoRoute));
router.post('/products', auth.requireAuthentication, auth.checkIfAdmin, catchErrors(createRoute));
router.patch('/products/:id', auth.requireAuthentication, auth.checkIfAdmin, catchErrors(patchRoute));
router.delete('/products/:id', auth.requireAuthentication, auth.checkIfAdmin, catchErrors(deleteRoute));

router.get('/categories', catchErrors(listCategoriesRoute));
router.post('/categories', auth.requireAuthentication, auth.checkIfAdmin, catchErrors(createCategoryRoute));
router.patch('/categories/:id', auth.requireAuthentication, auth.checkIfAdmin, catchErrors(patchCategoryRoute));
router.delete('/categories/:id', auth.requireAuthentication, auth.checkIfAdmin, catchErrors(deleteCategoryRoute));

module.exports = router;
