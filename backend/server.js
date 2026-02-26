require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./database');

const authRoutes = require('./routes/auth');
const goalRoutes = require('./routes/goals');
const financeRoutes = require('./routes/finance');

const app = express();

app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/finance', financeRoutes);

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
