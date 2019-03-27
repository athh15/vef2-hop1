const express = require('express');

const routerCart = express.Router();

/**
 * Higher-order fall sem umlykur async middleware með villumeðhöndlun.
 *
 * @param {function} fn Middleware sem grípa á villur fyrir
 * @returns {function} Middleware með villumeðhöndlun
 */
function catchErrors(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

// async function getCart(req, res) {
//   const cart = await getCartUser();
// }

// async function postCart(req, res) {

// }

routerCart.get('/cart', getCart);
routerCart.post('/cart', postCart);
