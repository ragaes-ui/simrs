
var
dotenv = require('dotenv').config(),
express = require('express'),
mongoDB = require('mongodb'),
io = require('socket.io'),
bcrypt = require('bcrypt'),
withThis = (obj, cb) => cb(obj),

app = express()
.use(express.static(
  process.env.production ?
  'production' : 'development'
))
.listen(process.env.PORT || 3000),

dbCall = action => mongoDB.MongoClient.connect(
  process.env.MONGO,
  {useNewUrlParser: true, useUnifiedTopology: true},
  (err, client) => err ? console.log(err)
  : action(client.db(process.env.dbname))
),

io = require('socket.io')(app)
io.on('connection', socket => [
  socket.on('datachange', (name, doc) =>
    socket.broadcast.emit('datachange', name, doc)
  ),
  socket.on('bcrypt', (text, cb) =>
    bcrypt.hash(text, 10, (err, res) => cb(res))
  ),
  socket.on('login', (creds, cb) => dbCall(db =>
    // cek ketersedian user yang dimaksud
    db.collection('users').findOne(
      { // hanya user aktif yang boleh login
        username: creds.username,
        keaktifan: 1
      },
      (err, res) => res && bcrypt.compare(
        // tes kebenaran password
        creds.password, res.password,
        // kembalikan doc user yg ditemukan
        (err, result) => cb({res: result && res})
      )
    )
  )), // alhamdulillah bisa pakai bcrypt
  socket.on('dbCall', (obj, cb) => dbCall(db => withThis(
    db.collection(obj.collection),
    coll => [console.log(obj.method, Date())] && ({
      find: () =>
        coll.find(obj.projection, obj.options)
        .toArray((err, res) => cb(res))
      ,
      findOne: () => coll.findOne(
        {_id: obj._id}, (err, res) => cb(res)
      ),
      insertOne: () => coll.insertOne(
        obj.document, (err, res) => cb(res)
      ),
      insertMany: () => coll.insertMany(
        obj.documents, (err, res) => cb(res)
      ),
      updateOne: () => coll.updateOne(
        {_id: obj._id}, {$set: obj.document},
        (err, res) => cb(res)
      ),
      deleteOne: () => coll.deleteOne(
        {_id: obj._id}, (err, res) => cb(res)
      ),
      getDifference: () => withThis(
        {
          ids: obj.clientColl.map(i => i._id),
          latest: obj.clientColl.reduce(
            (acc, inc) => inc.updated > acc ?
            inc.updated : acc, 0
          )
        },
        ({ids, latest}) => coll.find({$or: [
          // cari yg belum tersedia pada client
          {_id: {$not: {$in: ids}}},
          // cari yg lebih baru dari milik client
          {updated: {$gt: latest}}
        ]}).toArray((err, res) => cb(res))
      )
    }[obj.method]())
  )))
])

dbCall(db => withThis(
  db.collection('users'),
  users => users.findOne({}, (err, res) =>
    !res && users.insertOne({
      _id: '050zjiki5pqoi0f2ua0xdm',
      username: 'admin', nama: 'admin',
      bidang: 5, peranan: 4, keaktifan: 1,
      password: '$2b$10$xZ22.NIdyoSP65nPTRUf2uN9.Dd4gkCbChwD5fOCjTm4kSPHylS4a',
      updated: 1590416308426
    })
  )
))