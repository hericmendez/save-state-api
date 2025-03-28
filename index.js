const fastify = require('fastify')({ logger: true });
const cors = require("@fastify/cors");
const mongoose = require('mongoose');
const authRoutes = require('./src/routes/authRoutes');
const fastifyCookie = require("@fastify/cookie");

const dotenv = require("dotenv");
dotenv.config();

fastify.register(cors, {
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "OPTIONS"],     
  credentials: true              
});

mongoose.connect(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});


// Registra o plugin para suporte a cookies
fastify.register(fastifyCookie, {
  secret: "minhaChaveSecretaParaCookies", // Opcional: segredo para assinar cookies
});

const bcrypt = require('bcrypt');

async function testBcrypt() {
  const password = "senha123";
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log("Senha original:", password);
  console.log("Hash gerado:", hashedPassword);

  const isValid = await bcrypt.compare(password, hashedPassword);
  console.log("Comparação válida?", isValid);
}

testBcrypt();

fastify.register(authRoutes);

fastify.listen({ port: 1337 }, (err) => {
  if (err) {
    //fastify.log.error(err);
    process.exit(1);
  }
  console.log('Server running at http://localhost:1337');
});
