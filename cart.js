const express = require('express');

const routerCart = express.Router();

const {
  getOrdersUser, getAllOrdersUser, addToCart, getCartUser,
} = require('./db');
const { readTodo } = require('./todos');

const auth = require('./authentication');

/**
 * Higher-order fall sem umlykur async middleware með villumeðhöndlun.
 *
 * @param {function} fn Middleware sem grípa á villur fyrir
 * @returns {function} Middleware með villumeðhöndlun
 */
function catchErrors(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

async function getOrders(req, res) {
  const { user } = req;

  let orders = null;

  if (user.admin) {
    orders = await getAllOrdersUser(user.id);
  } else {
    orders = await getOrdersUser(user.id);
  }


  if (orders) {
    return res.status(200).json(orders);
  }
  return res.status(404).json({ error: 'No orders' });
}

/**
 * Validatear inputið hjá notendanum.
 * @param  {} username
 * @param  {} email
 * @param  {} password
 * @returns error fylki með öllum errors
 */

async function validateCart(product, quantity) {
  const errors = [];

  const item = await readTodo(product);

  if (typeof product !== 'number' || Number(product) < 0) {
    errors.push({ field: 'product', error: 'Product must be a positive integer' });
  }

  if (!item) {
    errors.push({ field: 'product', error: 'Product does not exist' });
  }

  if (typeof quantity !== 'number' || Number(quantity) < 0) {
    errors.push({ field: 'quantity', error: 'Quantity must be a positive integer' });
  }

  return errors;
}

async function postCart(req, res) {
  const {
    product,
    quantity = '',
  } = req.body;

  const { user } = req;

  const validationMessage = await validateCart(product, quantity);

  if (validationMessage.length !== 0) {
    return res.status(400).json(validationMessage);
  }

  const item = await readTodo(product);

  const cart = await addToCart(product, quantity, user.id);


  return res.status(201).json({ cart, item });
}

async function getCart(req, res) {
  const { user } = req;

  const cart = await getCartUser(user.id);

  if (cart) {
    return res.status(200).json(cart);
  }
  return res.status(404).json({ error: 'No cart' });
}

routerCart.post('/cart', auth.requireAuthentication, catchErrors(postCart));
routerCart.get('/cart', auth.requireAuthentication, catchErrors(getCart));
routerCart.get('/orders', auth.requireAuthentication, catchErrors(getOrders));

module.exports = routerCart;
