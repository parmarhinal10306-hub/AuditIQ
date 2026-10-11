const { getDB } = require('../config/db');
const { ObjectId } = require('mongodb');

const getCollection = () => getDB().collection('users');

/**
 * Creates a new user in the database.
 * Does not store plain-text passwords.
 *
 * @param {Object} userData - { name, email, passwordHash, isVerified, verificationToken, verificationTokenExpire }
 */
const createUser = async (userData) => {
  const collection = getCollection();
  const user = {
    name: userData.name,
    email: userData.email.toLowerCase().trim(),
    passwordHash: userData.passwordHash,
    isVerified: userData.isVerified ?? false,
    verificationToken: userData.verificationToken || null,
    verificationTokenExpire: userData.verificationTokenExpire || null,
    resetPasswordToken: null,
    resetPasswordExpire: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = await collection.insertOne(user);
  return { _id: result.insertedId, ...user };
};

/**
 * Finds a user by their exact email address (case-insensitive).
 *
 * @param {string} email
 */
const findUserByEmail = async (email) => {
  if (!email) return null;
  const collection = getCollection();
  const cleanEmail = email.toLowerCase().trim();
  return await collection.findOne({ email: cleanEmail });
};

/**
 * Finds a user by their MongoDB ObjectId.
 *
 * @param {string|ObjectId} userId
 */
const findUserById = async (userId) => {
  if (!userId) return null;
  const collection = getCollection();
  try {
    const id = typeof userId === 'string' ? new ObjectId(userId) : userId;
    return await collection.findOne({ _id: id });
  } catch {
    return null;
  }
};

/**
 * Updates a user document by ID.
 *
 * @param {string|ObjectId} userId
 * @param {Object} updateData
 */
const updateUser = async (userId, updateData) => {
  const collection = getCollection();
  const id = typeof userId === 'string' ? new ObjectId(userId) : userId;
  return await collection.updateOne(
    { _id: id },
    {
      $set: {
        ...updateData,
        updatedAt: new Date(),
      },
    }
  );
};

/**
 * Finds a user with an active, non-expired verification token.
 *
 * @param {string} verificationToken - SHA-256 hashed token
 */
const findUserByVerificationToken = async (verificationToken) => {
  if (!verificationToken) return null;
  const collection = getCollection();
  return await collection.findOne({
    verificationToken,
    verificationTokenExpire: { $gt: Date.now() },
  });
};

/**
 * Finds a user with an active, non-expired reset password token.
 *
 * @param {string} resetPasswordToken - SHA-256 hashed token
 */
const findUserByResetToken = async (resetPasswordToken) => {
  if (!resetPasswordToken) return null;
  const collection = getCollection();
  return await collection.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  findUserByVerificationToken,
  findUserByResetToken,
};
