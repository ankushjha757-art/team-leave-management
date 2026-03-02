// server.cjs
// Node/Express backend with JWT auth, MongoDB storage, and SSE for realtime updates.

const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { MongoClient, ObjectId } = require('mongodb')

const app = express()
const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'very-secret-key-change-me'

// ===== MongoDB setup =====
// Your Atlas URI, with a database name "leave_app" added before the '?'
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/leave_app'
let usersCollection
let leavesCollection

async function connectMongo() {
  const client = new MongoClient(MONGO_URI)
  await client.connect()
  const db = client.db() // uses DB from URI (leave_app)
  usersCollection = db.collection('users')
  leavesCollection = db.collection('leaves')
  console.log('Connected to MongoDB')
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

async function seedUsersIfEmpty() {
  const count = await usersCollection.countDocuments()
  if (count > 0) {
    console.log('Users already exist, skipping seed')
    return
  }

  const makeUser = (id, name, email, password, role) => ({
    _id: id,
    name,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    role,
  })

  const users = [
    makeUser('u1', 'Mr. Nikhil Yadav', 'nikhil@team.local', 'password123', 'employee'),
    makeUser('u2', 'Mr. Lalit Singh Bisht', 'lalit@team.local', 'password123', 'employee'),
    makeUser('u3', 'Mr. Girdhar Singh', 'girdhar@team.local', 'password123', 'employee'),
    makeUser('u4', 'Mr. Abhinandan Shukla', 'abhinandan@team.local', 'password123', 'employee'),
    makeUser('u5', 'Mr. Mohd Aquib', 'aquib@team.local', 'password123', 'employee'),
    makeUser('u6', 'Ms. Dipali Singh', 'dipali@team.local', 'password123', 'employee'),
    makeUser('u7', 'Mr. Ashutosh Srivastava', 'ashutosh@team.local', 'password123', 'employee'),
    makeUser('u8', 'Mr. Kunj Bihari Tiwari', 'kunj@team.local', 'password123', 'employee'),
    makeUser('u9', 'Mr. Subham Kumar', 'subham@team.local', 'password123', 'employee'),
    makeUser('u10', 'Mr. Naseem Akhtar', 'naseem@team.local', 'password123', 'employee'),
    makeUser('u11', 'Ms. Ranjana Maddheshiya', 'ranjana@team.local', 'password123', 'employee'),
    makeUser('u12', 'Mr. Pawan Singh', 'pawan@team.local', 'password123', 'employee'),
    // Abhishek replaced with Dolly
    makeUser('u13', 'Ms. Dolly', 'dolly@team.local', 'password123', 'employee'),
    makeUser('u14', 'Mr. Ankush Kumar Jha', 'ankush@team.local', 'password123', 'employee'),
    makeUser('u15', 'Mr. Mukesh Sahu', 'mukesh@team.local', 'password123', 'employee'),
    makeUser('manager1', 'Mr. Satyam Patel', 'satyam@team.local', 'manager123', 'manager'),
  ]

  await usersCollection.insertMany(users)
  console.log('Seeded users into MongoDB')
}

// ===== Express setup =====
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://team-leave-management.netlify.app',
    ],
  }),
)
app.use(express.json())

// ===== Auth middleware =====
function authMiddleware(req, res, next) {
  let token = null
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    token = header.substring(7)
  } else if (req.query && req.query.token) {
    token = String(req.query.token)
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing token' })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// ===== SSE (realtime) =====
const sseClients = []
let sseCachedLeaves = []

function broadcastLeaves() {
  const payload = JSON.stringify({ type: 'leaves-updated', leaves: sseCachedLeaves })
  sseClients.forEach((client) => {
    client.res.write(`data: ${payload}\n\n`)
  })
}

// ===== Routes =====

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const user = await usersCollection.findOne({
    email: String(email).toLowerCase(),
  })
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const passwordOk = user.passwordHash === hashPassword(password)
  if (!passwordOk) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = jwt.sign(
    { id: user._id, role: user.role, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: '8h' },
  )

  res.json({
    token,
    user: {
      uid: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  })
})

// Current user
app.get('/api/me', authMiddleware, async (req, res) => {
  const user = await usersCollection.findOne({ _id: req.user.id })
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  res.json({
    uid: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  })
})

// Get all leaves
app.get('/api/leaves', authMiddleware, async (req, res) => {
  const leaves = await leavesCollection.find({}).toArray()
  // Har document me id field add kar do (_id se)
  const normalized = leaves.map((l) => ({
    ...l,
    id: l._id.toString(),
  }))
  sseCachedLeaves = normalized
  res.json(normalized)
})

// Create leave
app.post('/api/leaves', authMiddleware, async (req, res) => {
  const { startDate, endDate, type, reason } = req.body
  if (!startDate || !type) {
    return res
      .status(400)
      .json({ error: 'startDate and type are required fields' })
  }
  const user = await usersCollection.findOne({ _id: req.user.id })
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  const now = new Date().toISOString()
  const leave = {
    employeeId: user._id,
    employeeName: user.name,
    startDate,
    endDate: endDate || startDate,
    type,
    reason: reason || '',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }

  const result = await leavesCollection.insertOne(leave)
  const saved = { ...leave, id: result.insertedId.toString(), _id: result.insertedId }

  sseCachedLeaves = [...sseCachedLeaves, saved]
  broadcastLeaves()

  res.status(201).json(saved)
})

// Update leave status (manager only)
app.patch('/api/leaves/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Manager role required' })
  }
  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: 'Invalid status' })
  }

  const now = new Date().toISOString()
  const result = await leavesCollection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { status, updatedAt: now } },
    { returnDocument: 'after' },
  )

  if (!result.value) {
    return res.status(404).json({ error: 'Leave not found' })
  }

  sseCachedLeaves = sseCachedLeaves.map((l) =>
    String(l._id) === String(result.value._id) ? result.value : l,
  )
  broadcastLeaves()

  res.json(result.value)
})

// Change password
app.post('/api/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: 'currentPassword and newPassword are required' })
  }
  const user = await usersCollection.findOne({ _id: req.user.id })
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  const passwordOk = user.passwordHash === hashPassword(currentPassword)
  if (!passwordOk) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }
  await usersCollection.updateOne(
    { _id: user._id },
    { $set: { passwordHash: hashPassword(newPassword) } },
  )
  res.json({ success: true })
})

// SSE events
app.get('/api/events', authMiddleware, async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  res.write('\n')

  const clientId = Date.now()
  const client = { id: clientId, res }
  sseClients.push(client)

  if (!sseCachedLeaves.length) {
    sseCachedLeaves = await leavesCollection.find({}).toArray()
  }
  const payload = JSON.stringify({ type: 'leaves-updated', leaves: sseCachedLeaves })
  res.write(`data: ${payload}\n\n`)

  req.on('close', () => {
    const idx = sseClients.findIndex((c) => c.id === clientId)
    if (idx !== -1) {
      sseClients.splice(idx, 1)
    }
  })
})

// Health check
app.get('/', (req, res) => {
  res.send('Leave management backend is running.')
})

// Start server after Mongo is ready
connectMongo()
  .then(seedUsersIfEmpty)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend server listening on http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to start server', err)
    process.exit(1)
  })