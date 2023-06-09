const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
// This is your test secret API key.
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

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
    const paymentCOllection = client.db("fooddb").collection("payments");



    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    });

// warning: use verifyJWT before useing verifyAdmin
    const verifyAdmin = async(req, res, next) => {
    const email = req.decoded.email;
    const query = {email: email}
    const user = await usersCOllection.findOne(query)
    if (user?.role !== 'admin') {
      return res.status(403).send({error: true, message: 'forbidden'})
    }
    next();
    };
    



    app.get('/users',verifyJWT, async (req, res) => {
      const result = await usersCOllection.find().toArray();
      res.send(result);
    })


    // user releted api
    app.post('/users', verifyJWT, verifyAdmin, async(req, res) => {
      const user = req.body;
      const query = { email: user.email}
      const existingUser = await usersCOllection.findOne(query)
      if (existingUser) {
        return res.send({message: "User already exists"})
      }
      const result = await usersCOllection.insertOne(user);
      res.send(result);
    })


    // security layer
    // email check
    // check admin
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await usersCOllection.findOne(query);
      const result = { admin: user?.role === 'admin' }
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

// insert food menu
app.post('/menu',verifyJWT, verifyAdmin, async (req, res)=>{
  const newItem = req.body;
  const result = await foodCOllection.insertOne(newItem)
  res.send(result);
})

// delete food
app.delete('/menu/:id',verifyJWT, verifyAdmin, async (req, res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const result = await foodCOllection.deleteOne(query)
  res.send(result)
});



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
    return res.status(403).send({ error: true, message: 'forbidden access' });
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


// payment methods
app.post('/create-payment-intent' , verifyJWT ,async(req, res)=>{
  const  {price} = req.body;
  const amount = price*100;
   // Create a PaymentIntent with the order amount and currency
   const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    payment_method_types: [
      "card"
    ],
  }); 
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
})


// payment related pai
app.post('/payment',verifyJWT,  async ( req, res )=>{
  const payment = req.body;
  const result = await paymentCOllection.insertOne(payment)
  const query = {_id: {$in: payment.cartItems.map(id => new ObjectId(id))}}
  const deletedResult = await cartCOllection.deleteMany(query)
  res.send({result, deletedResult})
})


app.get('/admin-stats',verifyJWT, verifyAdmin, async(req, res)=>{
  const users = await usersCOllection.estimatedDocumentCount()
  const products = await foodCOllection.estimatedDocumentCount()
  const orders = await paymentCOllection.estimatedDocumentCount()

  const payments = await paymentCOllection.find().toArray()
  const revenue = payments.reduce((sum, payment)=>sum + payment.price, 0)

  res.send({users, products, orders, revenue})
})



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