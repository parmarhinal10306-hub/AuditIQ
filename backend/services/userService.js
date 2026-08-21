const { getDB } = require('../config/db');

const getCollection = () => getDB().collection('users');

/**
 * Creates a new user in the database.
 * Does not store plain-text passwords based on strict constraint 
 * (calling route should hash password and pass `passwordHash`).
 * 
 * @param {Object} userData - Expected { name, email, passwordHash }
 */
const createUser = async (userData) => {
  const collection = getCollection();
  const user = {
    name: userData.name,
    email: userData.email,
    passwordHash: userData.passwordHash,
    createdAt: new Date()
  };
  const result = await collection.insertOne(user);
  return { _id: result.insertedId, ...user };
};

/**
 * Finds a user by their exact email address.
 * 
 * @param {string} email 
 */
const findUserByEmail = async (email) => {
  const collection = getCollection();
  return await collection.findOne({ email });
};

const updateUser = async (userId, updateData) => {
  const collection = getCollection();
  const { ObjectId } = require('mongodb');
  return await collection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: updateData }
  );
};

const findUserByResetToken = async (resetPasswordToken) => {
  const collection = getCollection();
  return await collection.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });
}

module.exports = {
  createUser,
  findUserByEmail,
  updateUser,
  findUserByResetToken
};
