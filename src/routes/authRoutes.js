const authController = require('../controllers/authController');

module.exports = async (fastify) => {
  fastify.post('/register', authController.register);
  fastify.post("/login", authController.login)
};
