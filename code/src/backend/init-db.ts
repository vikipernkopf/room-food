import { Unit } from "./unit.js";
import express from 'express';
import cors from 'cors';
import {loginRouter} from './login/login-router';

const unit = new Unit(true);
unit.complete();

console.log("Database room-food.db created!");

// Set up server for backend - I don't know how to do it differently
const app = express();
const PORT = 3000;

// Essential: Allows your Angular app (port 4200) to talk to this server (port 3000)
app.use(cors());
app.use(express.json());

app.use("/api",loginRouter)
app.listen(PORT, () => {
	console.log(`Backend server running at http://localhost:${PORT}`);
});
