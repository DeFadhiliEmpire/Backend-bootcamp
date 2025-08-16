const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const NodeCache = require("node-cache");
const { body, validationResult } = require("express-validator");
const { trace } = require("console");
require("dotenv").config();

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(cors());
const cache = new NodeCache({ stdTTl: 600 });

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URL;
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected seccesfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

//Model creation schemas
const taskSchema = new mongoose.Schema({
  tittle: { type: String, required: true, trim: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Task = mongoose.model("Task", taskSchema);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

//validator
const validateTask = [
  body("tittle").isString().notEmpty().trim().isLength({ min: 3 }),
  body("completed").isBoolean(),
];

//Jwt middleware
const auth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer", "");
  if (!token) return res.status(404).json({ error: "Access denied" });
  try {
    const decode = jwt.verify(token, "Secret-key");
    req.user = decode;
    next();
  } catch (error) {
    return res.status(404).json({ error: "Invalid or expired token" });
  }
};

//user signup endpoint /route
app.post(
  "/signup",
  [
    body("username").isString().notEmpty().trim().isLength({ min: 3, max: 30 }),
    body("password").isString().notEmpty().isLength({ min: 3 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      //check if user already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      //create a user
      const user = new User({
        username,
        password,
      });

      await user.save();

      //Generate a JWT token
      const token = jwt.sign({ id: user._id }, "secret-key", {
        expiresIn: "1h",
      });

      res.status(200).json({
        message: "User Created succesfully",
        token,
        user: {
          id: user._id,
          username: user.username,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error("Signup error", error);
      return res.status(500).json({ error: "Failed to craete User" });
    }
  }
);

//user login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) {
    return res.status(401).json({ error: "Invalid Credentials" });
  }
  const token = jwt.sign({ id: user._id }, "secret-key", { expiresIn: "1h" });
});

// Fetch taks
app.get("/tasks", async (req, res) => {
  const cachekey = `all_tasks_${req.user.id}`;
  const cacheTasks = cache.get(cachekey);

  if (cacheTasks) return res.json(cacheTasks);

  const tasks = await Task.find({ userId: req.user.id });
  cache.set(cachekey, tasks);
  res.json(tasks);
});

//crearing a new task

app.post("/tasks", validateTask, async (req, res) => {
  const error = await validatationResult(req);
  if (!error.isEmpty()) {
    return res.status(400).json({ error: error.array });
  }
  const task = new Task(req.body);
  await task.save();
  res.status(200).json(task);
});

// Getting a task based upon the id.
app.get("/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        error: "Task not found",
        message: "No task exists with the provided ID",
      });
    }
    res.json({
      message: "Task retrieved successfully!",
      task,
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({
      error: "Failed to fetch task",
      details: error.message,
    });
  }
});

//PUT-task
app.put("/tasks/:id", async (req, res) => {
  try {
    const tasks = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!tasks) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

//Delete Task
app.delete("/task/:id",(req,res)=>{
""
    res.json({})
    console.error("",error);
    res.status(500).json()
  
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
