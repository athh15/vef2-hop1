const express = require('express');

const routerCart = express.Router();

const {
  createCartTodo,
} = require('./todos');

/**
 * Higher-order fall sem umlykur async middleware með villumeðhöndlun.
 *
 * @param {function} fn Middleware sem grípa á villur fyrir
 * @returns {function} Middleware með villumeðhöndlun
 */
function catchErrors(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

async function getCart(req, res) {

}

async function postCart(req, res) {
  const {
    is_order,
    name,
    address,
  } = req.body;

  const result = await createCartTodo({
    is_order,
    name,
    address,
  });

  if (!result.success) {
    return res.status(400).json(result.validation);
  }

  return res.status(201).json(result.item);

}

routerCart.get('/cart', getCart);
routerCart.post('/cart', postCart);
