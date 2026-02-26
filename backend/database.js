const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
    try {
        // This will create a MongoDB Memory Server instance that automatically
        // downloads the binary if it doesn't already exist and runs it in RAM
        const mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        await mongoose.connect(mongoUri);
        console.log(`Connected to in-memory MongoDB at: ${mongoUri}`);
    } catch (err) {
        console.error('Failed to connect to in-memory MongoDB', err);
        process.exit(1);
    }
};

module.exports = connectDB;
