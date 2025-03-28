const jwt = require('jsonwebtoken');
const secret = "minhaChaveSecreta123"; // Use o mesmo segredo em ambos

exports.generateToken = (userId, role) => {
  return jwt.sign(
    { userId: userId, role: role }, // Payload
    "minhaChaveSecreta123", // Segredo unificado
    { expiresIn: "1d", algorithm: "HS256" } // Algoritmo padrão
  );
};

exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, secret); // O mesmo segredo aqui
  } catch (err) {
    return null;
  }
};
