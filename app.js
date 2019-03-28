require('dotenv').config();

const jwt = require('jsonwebtoken');
const express = require('express');
const { ExtractJwt } = require('passport-jwt');
const fs = require('fs');

const {
  findById, findByUsername, comparePasswords, createUser, getAllUsers, updateUser, findByEmail,
} = require('./users');

const api = require('./api');
const cart = require('./cart');
const auth = require('./authentication');

const {
  PORT: port = 3000,
  JWT_SECRET: jwtSecret,
  TOKEN_LIFETIME: tokenLifetime = 60 * 60 * 24,
  HOST: host = '127.0.0.1',
} = process.env;

if (!jwtSecret) {
  console.error('JWT_SECRET not registered in .env');
  process.exit(1);
}

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: jwtSecret,
};

const app = express();

app.use(express.json());
app.use(cart);
app.use(api);
app.use(auth);

/**
 * Fall sem loggar notendan inn, tekur username og password úr req.body
 * og leitar að notendanum í db
 * @param  {} req
 * @param  {} res
 */
async function login(req, res) {
  const { username, password = '' } = req.body;

  const user = await findByUsername(username);

  if (!user) {
    return res.status(401).json({ error: 'No such user' });
  }

  const passwordIsCorrect = await comparePasswords(password, user.password);

  if (passwordIsCorrect) {
    const notandi = await findById(user.id);
    const payload = { id: user.id };
    const tokenOptions = { expiresIn: tokenLifetime };
    const token = jwt.sign(payload, jwtOptions.secretOrKey, tokenOptions);
    return res.json({ notandi, token, tokenLifetime });
  }

  return res.status(401).json({ error: 'Invalid password' });
}
/**
 * Athugar hvort passwordið sé eitt af 500 weak passwords
 * @param  {} pass
 * @returns true ef passwordið er eitt af 500, false annars
 */
function checkPassword(pass) {
  return new Promise(((resolve, reject) => {
    fs.readFile('./weakPasswords.txt', (error, result) => {
      if (error) {
        reject(error);
      } else if (result.indexOf(pass) >= 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }));
}

/**
 * Validatear inputið hjá notendanum.
 * @param  {} username
 * @param  {} email
 * @param  {} password
 * @returns error fylki með öllum errors
 */

async function validateUser(username, email, password) {
  const errors = [];

  if (typeof username !== 'string' || username.length < 5) {
    errors.push({ field: 'username', error: 'Notendanafn verður að vera amk 5 stafir' });
  }

  if (typeof email !== 'string' || email.length < 1) {
    errors.push({ field: 'email', error: 'Netfang má ekki vera tómt' });
  }

  const user = await findByUsername(username);

  const userEmail = await findByEmail(email);

  if (user) {
    errors.push({ field: 'username', error: 'Notendanafn er þegar skráð' });
  }

  if (userEmail) {
    errors.push({ field: 'email', error: 'Notendanafn er þegar skráð' });
  }

  const weakPass = await checkPassword(password);
  if (weakPass) {
    errors.push({ field: 'password', error: 'Password too weak!' });
  }

  if (typeof password !== 'string' || password.length < 8) {
    errors.push({ field: 'password', error: 'Lykilorð verður að vera amk 8 stafir' });
  }
  return errors;
}

/**
 * Fall sem býr til notenda, tekur username, email og password úr req.body
 * ef það kemst í gegnum validation þá býr það til nýjan notenda annars birtir error
 * @param  {} req
 * @param  {} res
 */
async function register(req, res) {
  const { username, email, password = '' } = req.body;

  const validationMessage = await validateUser(username, email, password);

  if (validationMessage.length !== 0) {
    return res.status(400).json(validationMessage);
  }

  await createUser(username, email, password);

  const user = await findByUsername(username);

  const payload = { id: user.id };
  const tokenOptions = { expiresIn: tokenLifetime };
  const token = jwt.sign(payload, jwtOptions.secretOrKey, tokenOptions);
  return res.status(201).json({ token, username });
}
/**
 * Skila öllum notendum í db
 * @param  {} req
 * @param  {} res
 */
async function getUsers(req, res) {
  const users = await getAllUsers();

  return res.status(200).json(users);
}

/**
 * Skilar notenda eftir id og skilar upplýsingar um notendan ef hann kallar á /me
 * @param  {} req
 * @param  {} res
 */
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
 * Uppfærir upplýsingar um notenda ef notandi er admin
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

  const result = await updateUser(user.id, admin);
  return res.status(200).json(result);
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
  });
});

app.get('/users/', auth.requireAuthentication, getUsers);
app.get('/users/:id', auth.requireAuthentication, getUserID); // Skíta fix fyrir /me for now
app.patch('/users/:id', auth.requireAuthentication, auth.checkIfAdmin, patchUser); // Notandi þarf að vera admin
app.post('/users/register', register);
app.post('/users/login', login);

app.use(notFoundHandler);
app.use(errorHandler);


app.listen(port, () => {
  if (host) {
    console.info(`Server running at http://${host}:${port}/`);
  }
});
