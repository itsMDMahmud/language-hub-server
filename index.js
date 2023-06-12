const express = require("express");
const cors = require("cors");
require("dotenv").config();
// ("mongodb");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

// const usersCollection = client.db("languageDb").collection('users');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.reyfrcm.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("languageDb").collection("users");
    const classCollection = client.db("languageDb").collection("classes");
    const cartCollection = client.db("languageDb").collection("carts");
    const paymentCollection = client.db("languageDb").collection("payments");

    app.get("/users", async (req, res) => {
      // const user = req.body;
      const result = await usersCollection.find().toArray();
      res.send(result);
    });


    //paymentsCollection
    // app.get("/payments", async (req, res) => {
    //   // const user = req.body;
    //   const result = await payments.find().toArray();
    //   res.send(result);
    // });

    app.get("/allusers", async (req, res) => {
      // const user = req.body;
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    //users APIs (data update)
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      // console.log("existingUser", existingUser);
      if (existingUser) {
        return res.send({ message: "user already exist" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    

    //cart collection
    app.post('/carts', async(req, res) => {
      const item = req.body;
      // console.log(item);
      const result = await cartCollection.insertOne(item);
      // console.log(result);
      res.send(result);
    } )

    //student dashboard enrolled classes
    // app.get('/carts',  async(req, res) => {
    //   const email = req.query.email;
    //   console.log(email);
    //   if (!email) {
    //     res.send([]);
    //   }

    //   // const decodedEmail = req.decoded.email;
    //   // if (email !== decodedEmail) {
    //   //   return res.status(403).send({error: true, message: 'forbidden access'})
    //   // }

    //   const query = {email: email};
    //   // console.log(query);
    //   const result = await cartCollection.find(query).toArray();
    //   res.send(result);
    // })
    


    //add class / my class
    //  app.get('/carts', async(req, res) => {
    //     const result = await cartCollection.find().toArray();
    //     res.send(result);
    //   })

    app.get('/carts/:email', async(req, res) => {
      // console.log(req.query);
      const email = req.params.email;
      const query = {UserEmail: email};
      
      const result = await cartCollection.find(query).toArray();
      res.send(result)
    })



    //delete enrolled course
    app.delete('/carts/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    } )

     

    app.post('/classes', async(req, res) => {
        const addClass = req.body;
        // console.log(addClass);
        const result = await classCollection.insertOne(addClass);
        res.send(result);
    })

    //only my classes with email
    app.get('/classes', async(req, res) => {
      // console.log(req.query);
      let query = {};
      if (req.query?.email) {
          query = {email: req.query.email}
      } 
      const result = await classCollection.find(query).toArray();
      res.send(result)
    })

    //update role
    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = {email: email}
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin'}
      res.send(result);

    })

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });


    //-----------------------------------------------------------------------------------------

    //update role instructors
    app.get('/users/instructor/:email', async (req, res) => {
      const email = req.params.email;

      // if (req.decoded.email !== email) {
      //   res.send({admin: false})
      // }

      const query = {email: email}
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor'}
      res.send(result);

    })

    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });


    //create paynment intent
    app.post("/create-payment-intent",  async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price*100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret 
      })    
    });


    //payment related api
    app.post('/payments', async(req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      res.send(result);      
    } )

    //payment history with my email
    app.get('/payments', async(req, res) => {
      let query = {};
      if (req.query?.email) {
          query = {email: req.query.email}
      } 
     
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
  })
  
  
  //approved and declined post by admin----------------------
  app.patch("/classes/:_id", async (req, res) => {
    const _id = req.params._id;
    // console.log(id);
    const updateStatus = req.body;
    const filter = { _id: new ObjectId(_id) }
    const updateDoc = {
      $set: {
          status: updateStatus.status
      }
  }
    const result = await classCollection.updateOne(filter, updateDoc);
    res.send(result);
  });



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Language hub server is running");
});

app.listen(port, () => {
  console.log(`Language hub server is running on port: ${port}`);
});
