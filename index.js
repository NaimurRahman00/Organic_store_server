// Import required modules
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 4000;
const app = express();

// Middleware setup
const corsOptions = {
    origin: ["http://localhost:5173", "https://organ-store.netlify.app", "https://organstore.vercel.app"],
    credentials: true,
    optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lt2wcqp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        const productsCollection = client.db('OrganStore').collection('Products');

        // Get all Products data from db + pagination + conditional sorting + search
        app.get('/products', async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const skip = (page - 1) * limit;

            const sortBy = req.query.sortBy;
            const order = req.query.order === 'asc' ? 1 : -1;

            const searchQuery = req.query.search || '';
            const minPrice = parseFloat(req.query.minPrice) || 0;
            const maxPrice = parseFloat(req.query.maxPrice) || Infinity;

            const brands = req.query.brands ? req.query.brands.split(',') : [];
            const categories = req.query.categories ? req.query.categories.split(',') : [];

            const sortOptions = {};
            if (sortBy) {
                sortOptions[sortBy] = order;
            }

            // Search filter
            const searchFilter = searchQuery
                ? { productName: { $regex: searchQuery, $options: 'i' } }
                : {};

            // Price range filter
            const priceFilter = {
                price: { $gte: minPrice, $lte: maxPrice },
            };

            // Brand and Category filters
            const brandFilter = brands.length > 0 ? { brand: { $in: brands } } : {};
            const categoryFilter = categories.length > 0 ? { category: { $in: categories } } : {};

            // Combine all filters
            const filter = {
                ...searchFilter,
                ...priceFilter,
                ...brandFilter,
                ...categoryFilter,
            };

            const totalProducts = await productsCollection.countDocuments(filter);
            const totalPages = Math.ceil(totalProducts / limit);

            const products = await productsCollection
                .find(filter)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .toArray();

            res.send({
                products,
                totalPages,
                currentPage: page,
                totalProducts,
            });
        });

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Optional: Close the client connection when you're done
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hi OrganStore users');
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
