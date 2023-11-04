const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
const port = 5000;

app.use(express.json());
app.use(cookieParser());
app.use({
  origin:'http://localhost:5173',
  credential: true 
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o2tazeo.mongodb.net/?retryWrites=true&w=majority`;

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
    // Send a ping to confirm a successful connection

    const serviceCollection = client.db("clean-co").collection("services");
    const bookingCollection = client.db("clean-co").collection("booking");

    // middleware
    // verify token
    const gateman = (req, res, next) => {
      const { token } = req.cookies;
      // console.log(token);
      if (!token) {
        return res.status(401).send({ message: "You are not authorize" });
      }

      // verify a token symmetric
      jwt.verify(token, process.env.DB_USER_ACCESS, function (err, decoded) {
        if (err) {
          return res.status(401).send({ message: "You are not authorize" });
        }

        req.user = decoded;
        next();
      });
    };

    app.post("/api/v1/user/create-booking", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // user specific bookings

    app.get("/api/v1/user/booking", gateman, async (req, res) => {
      const queryEmail = req.query.email;
      const tokenEmail = req.query.email;
      // match user token email

      if (queryEmail !== tokenEmail) {
        return res.status(403).send({message :'forbidden access'})
      }


      let query = {};
      if (queryEmail) {
        query.email = queryEmail;
      }
      const result = await bookingCollection.find(query).toArray();
        res.send(result);
    });

    app.delete("/api/v1/user/cancel-booking/:bookingId", async (req, res) => {
      const id = req.params.bookingId;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/api/v1/auth/access-token", (req, res) => {
      // create in token
      const user = req.body;
      const token = jwt.sign(user, process.env.DB_USER_ACCESS, {
        expiresIn: 60 * 60,
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    app.get("/api/v1/services", gateman, async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

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
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`clean co server listening on port ${port}`);
});
