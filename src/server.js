

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser'; 
import authRoutes from './routes/authRoutes.js';
import queryRoutes from './routes/queryRoutes.js';  

dotenv.config();
const app = express();

app.use(cors({
  origin: 'https://secure-query-ai.vercel.app/',
  credentials: true
}));

app.use(express.json());
app.use(cookieParser()); 

app.use('/api/auth', authRoutes);
app.use('/api/query', queryRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
