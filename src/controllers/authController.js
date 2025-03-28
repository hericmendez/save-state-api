const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const fastify = require("fastify")();
const { generateToken } = require('../utils/jwtUtils');

exports.register = async (req, reply) => {
  const { username, email, password, role } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({
    username,
    email,
    password: hashedPassword,
    role,
  });

  await newUser.save();
  console.log("Usuário registrado com hash:", hashedPassword);
  reply.code(201).send({ message: "Usuário registrado com sucesso!" });
};

exports.login = async (req, reply) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  console.log("Usuário encontrado:", user);
  if (!user) {
    return reply.code(401).send({ error: "Usuário não encontrado!" });
  }

  console.log("Senha recebida no servidor:", password);
  console.log("Senha armazenada no banco:", user.password);

  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  console.log("isPasswordValid ==> ", isPasswordValid);
  if (!isPasswordValid) {
    return reply.code(401).send({ error: "Credenciais inválidas!" });
  }

  const token = generateToken(user._id, user.role);
  reply.setCookie("session", token, {
    path: "/", // Cookie disponível em todas as rotas
    maxAge: 86400, // Expiração em 1 dia
    httpOnly: false, // Permite acesso pelo client-side (use true para mais segurança no futuro)
  });
  console.log("Cookie configurado no servidor!");

  reply.send({ message: "Cookie configurado!", token });
};

