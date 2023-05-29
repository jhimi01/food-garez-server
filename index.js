const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());




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

    const foodCOllection = client.db("fooddb").collection("allfooods");
    const reviewsCOllection = client.db("fooddb").collection("reviews");
    const cartCOllection = client.db("fooddb").collection("carts");

app.get('/menu', async (req, res)=>{
    const result = await foodCOllection.find().toArray();
    res.send(result);
})
app.get('/reviews', async (req, res)=>{
    const result = await reviewsCOllection.find().toArray();
    res.send(result);
})


// cart collection apis

app.get('/carts', async (req, res)=>{
  const email = req.query.email;
  console.log(email);
  if (!email) {
    res.send([])
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