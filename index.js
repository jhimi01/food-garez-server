const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized' });
  }
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {  
      return res.status(401).send({ error: true, message: 'unauthorized' });
    }
    req.decoded = decoded;
    next();
  })

};





const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.FOOD_USER}:${process.env.FOOD_PASS}@cluster0.ysrfscy.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCOllection = client.db("fooddb").collection("users");
    const foodCOllection = client.db("fooddb").collection("allfooods");
    const reviewsCOllection = client.db("fooddb").collection("reviews");
    const cartCOllection = client.db("fooddb").collection("carts");



    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    });
    



    app.get('/users', async (req, res) => {
      const result = await usersCOllection.find().toArray();
      res.send(result);
    })


    // user releted api
    app.post('/users', async(req, res) => {
      const user = req.body;
      const query = { email: user.email}
      const existingUser = await usersCOllection.findOne(query)
      if (existingUser) {
        return res.send({message: "User already exists"})
      }
      const result = await usersCOllection.insertOne(user);
      res.send(result);
    })


    app.patch('/users/admin/:id', async(req, res) => {
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)};
      const updateDoc = {
        $set: {
         role: 'admin',
        },
      };

      const result = await usersCOllection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.delete('/users/admin/:id', async (req, res) => {
 const id = req.params.id;
 const query = {_id: new ObjectId(id)}
 const result = await usersCOllection.deleteOne(query)
 res.send(query)
    })



    // all food related apis
app.get('/menu', async (req, res)=>{
    const result = await foodCOllection.find().toArray();
    res.send(result);
})

// reviews releted apis
app.get('/reviews', async (req, res)=>{
    const result = await reviewsCOllection.find().toArray();
    res.send(result);
})


// cart collection apis

app.get('/carts', verifyJWT, async (req, res)=>{
  const email = req.query.email;
  console.log(email);
  if (!email) {
    res.send([])
  }

  const decodedEmail = req.decoded.email;
  if (email !== decodedEmail) {
    return res.status(403).send({ error: true, message: 'phorbidden access' });
  }

  const query = { email : email};
  const result = await cartCOllection.find(query).toArray();
  res.send(result)
})

app.post('/carts', async(req, res)=>{
    const item = req.body;
    const result = await cartCOllection.insertOne(item);
    res.send(result);
});


app.delete('/carts/:id', async(req, res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)};
  const result = await cartCOllection.deleteOne(query);
  res.send(result)
});


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('food world!')
})

app.listen(port, () => {
  console.log(`Food Garez on port ${port}`)
})