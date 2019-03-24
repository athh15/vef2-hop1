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

const router = express.Router();

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
  const { category, order, search } = req.query;

  const todos = await listTodos(order, category, search);

  return res.json(todos);
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
    title,
    price,
    about,
    img,
  } = req.body;

  const result = await createTodo({
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
    return res.json(todo);
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
router.post('/products', catchErrors(createRoute));
router.patch('/products/:id', catchErrors(patchRoute));
router.delete('/products/:id', catchErrors(deleteRoute));

router.get('/categories', catchErrors(listCategoriesRoute));
router.post('/categories', catchErrors(createCategoryRoute));
router.patch('/categories/:id', catchErrors(patchCategoryRoute));
router.delete('/categories/:id', catchErrors(deleteCategoryRoute));

module.exports = router;
