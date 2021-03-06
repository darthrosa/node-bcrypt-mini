require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const massive = require('massive');
const app = express();
let { SERVER_PORT, CONNECTION_STRING, SESSION_SECRET } = process.env;


app.use(express.json());


app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  })
);

app.post('/auth/signup', async(req, res) => {
  const {email, password} = req.body;
  const db = req.app.get('db');

  let user = await db.check_user_exists(email);
  if(user[0]){
    return res.status(400).send('Email already exists');
  }
  let salt = bcrypt.genSaltSync(10);
  let hash = bcrypt.hashSync(password, salt);
  
  let newUser = await db.create_user(email, hash);
  req.session.user = {id: newUser[0].id, email: newUser[0].email};
  res.status(201).send(req.session.user);
});

app.post('/auth/login', async(req, res) => {
  const {email, password} = req.body;
  const db = req.app.get('db');

  let user = await db.check_user_exists(email);
  if(!user[0]){
    return res.status(400).send('Email not found');
  }
  let authenticated = bcrypt.compareSync(password, user[0].user_password);
  if(!authenticated){
    return res.status(401).send('PAssword is incorrect');
  }
  req.session.user = {id: user[0].id, email: user[0].email};
  res.status(202).send(req.session.user);
});

app.get('/auth/logout', (req, res) => {
  req.session.destroy();
  res.sendStatus(200);
});

app.get('/auth/user', (req, res) => {
  if(req.session.user){
    res.status(200).send(req.session.user);
  } else {
    res.status(200).send('No user on session')
  }
});


massive(CONNECTION_STRING).then(db => {
  app.set('db', db);
  console.log('db listening yo')
  app.listen(SERVER_PORT, () => {console.log(`Listening on port: ${SERVER_PORT}`)});
});

