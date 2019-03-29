const express = require('express');
const passport = require('passport');
const { Strategy, ExtractJwt } = require('passport-jwt');

const {
  findById,
} = require('./users');

const app = express();
app.use(express.json());

/**
 * Strategy fyrir passport
 * @param  {Object} data
 * @param  {Object} next
 * @returns next()
 */
async function strat(data, next) {
  const user = await findById(data.id);

  if (user) {
    next(null, user);
  } else {
    next(null, false);
  }
}

// Þetta er ekki að virka hjá okkur fyrir Heroku
// const {
//   JWT_SECRET: jwtSecret,
// } = process.env;

// if (!jwtSecret) {
//   console.error('JWT_SECRET not registered in .env');
//   process.exit(1);
// }

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken('JWT'),
  secretOrKey: process.env.JWT_SECRET = '$dk3Ae9dknv#Gposiuhvkjkljd',
};

passport.use(new Strategy(jwtOptions, strat));

app.use(passport.initialize());

/**
 * Middleware sem athugar hvort notandi sé admin
 * @param  {object} req
 * @param  {object} res
 * @param  {object} next
 * @returns next() ef notandi er admin annars villu
 */
function checkIfAdmin(req, res, next) {
  if (!req.user.admin) {
    return next(res.status(403).json({ error: 'Forbidden' }));
  }
  return next();
}

/**
 * Middleware sem athugar hvort notandi sé skráður inn eða ekki
 * @param  {object} req
 * @param  {object} res
 * @param  {object} next
 * @returns next() ef notandi er skráður inn annars villu
 */
function requireAuthentication(req, res, next) {
  return passport.authenticate(
    'jwt',
    { session: false },
    (err, user, info) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        const error = info.name === 'TokenExpiredError'
          ? 'expired token' : 'invalid token';

        return res.status(401).json({ error });
      }

      req.user = user;
      return next();
    },
  )(req, res, next);
}

module.exports = app;
module.exports.requireAuthentication = requireAuthentication;
module.exports.checkIfAdmin = checkIfAdmin;
