require('dotenv').config();

const express = require('express');
const passport = require('passport');
const { Strategy, ExtractJwt } = require('passport-jwt');
const jwt = require('jsonwebtoken');

const {
  findById, findByEmail, comparePasswords, createUser, getAllUsers, updateUser,
} = require('./users');

const api = require('./api');

const {
  PORT: port = 3000,
  JWT_SECRET: jwtSecret,
  TOKEN_LIFETIME: tokenLifetime = 20 * 60,
  HOST: host = '127.0.0.1',
} = process.env;

if (!jwtSecret) {
  console.error('JWT_SECRET not registered in .env');
  process.exit(1);
}

const app = express();

app.use(express.json());
app.use(api);

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: jwtSecret,
};

async function strat(data, next) {
  const user = await findById(data.id);

  if (user) {
    next(null, user);
  } else {
    next(null, false);
  }
}

passport.use(new Strategy(jwtOptions, strat));

app.use(passport.initialize());

async function login(req, res) {
  const { email, password = '' } = req.body;

  const user = await findByEmail(email);

  if (!user) {
    return res.status(401).json({ error: 'No such user' });
  }

  const passwordIsCorrect = await comparePasswords(password, user.password);

  if (passwordIsCorrect) {
    const payload = { id: user.id };
    const tokenOptions = { expiresIn: tokenLifetime };
    const token = jwt.sign(payload, jwtOptions.secretOrKey, tokenOptions);
    return res.json({ token });
  }

  return res.status(401).json({ error: 'Invalid password' });
}

/**
 * @param  {} email
 * @param  {} password
 */

async function validateUser(email, password) {
  if (typeof email !== 'string' || email.length < 5) {
    return { error: 'Netfang verður að vera amk 5 stafir' };
  }

  const user = await findByEmail(email);

  if (user) {
    return { error: 'Netfang er þegar skráð' };
  }

  if (typeof password !== 'string' || password.length < 8) {
    return { error: 'Lykilorð verður að vera amk 8 stafir' };
  }
  return null;
}

async function register(req, res) {
  const { email, password = '' } = req.body;

  const validationMessage = await validateUser(email, password);

  if (validationMessage) {
    return res.status(400).json(validationMessage);
  }
  await createUser(email, password);

  const user = await findByEmail(email);

  const payload = { id: user.id };
  const tokenOptions = { expiresIn: tokenLifetime };
  const token = jwt.sign(payload, jwtOptions.secretOrKey, tokenOptions);
  return res.status(201).json({ token, email });
}

async function getUsers(req, res) {
  const users = await getAllUsers();

  return res.status(200).json(users);
}


async function getUserID(req, res) {
  let { id } = req.params;

  if (id === 'me') {
    const user = await findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(user);
  }
  id = parseInt(id, 10);

  if (!Number.isInteger(id)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const user = await findById(id);

  if (!user) {
    return res.status(404).json({ error: 'Not found' });
  }

  return res.status(200).json(user);
}

/**
 * @param  {} req
 * @param  {} res
 */
async function patchUser(req, res) {
  const { id } = req.params;
  if (Number.isInteger(id)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const { admin = '' } = req.body;
  if (typeof admin !== 'boolean') {
    return res.status(400).json({ error: 'Admin has to be a boolean type' });
  }

  const user = await findById(id);

  // console.log(user.id);
  if (!req.user.admin) {
    return res.status(400).json({ error: 'User not an admin' });
  }

  const result = await updateUser(user.id, admin);
  return res.status(200).json(result);
}


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

function notFoundHandler(req, res, next) { // eslint-disable-line
  console.warn('Not found', req.originalUrl);
  res.status(404).json({ error: 'Not found' });
}

function errorHandler(err, req, res, next) { // eslint-disable-line
  console.error(err);

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid json' });
  }

  return res.status(500).json({ error: 'Internal server error' });
}

app.get('/', (req, res) => {
  res.json({
    getUsers: '/users',
    getUserId: '/users/:id',
    register: '/users/register',
    login: '/users/login',
    admin: '/users/admin',
  });
});

app.get('/users/', getUsers);
app.get('/users/:id', requireAuthentication, getUserID); // Skíta fix fyrir /me for now
app.patch('/users/:id', requireAuthentication, patchUser);
app.post('/users/register', register);
app.post('/users/login', login);
app.get('/users/admin', requireAuthentication, (req, res) => {
  res.json({ data: 'top secret' });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  if (host) {
    console.info(`Server running at http://${host}:${port}/`);
  }
});
