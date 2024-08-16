// Import required modules
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 4000;
const app = express();

// Middleware setup
const corsOptions = {
    origin: ["http://localhost:5173"],
    credentials: true,
    optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

        // Get all Products data from db + pagination + conditional sorting + search + filters
        app.get('/products', async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const skip = (page - 1) * limit;

            const sortBy = req.query.sortBy;
            const order = req.query.order === 'asc' ? 1 : -1;

            const searchQuery = req.query.search || '';
            const brandNames = req.query.brands ? req.query.brands.split(',') : [];
            const categories = req.query.categories ? req.query.categories.split(',') : [];
            const minPrice = parseFloat(req.query.minPrice) || 0;
            const maxPrice = parseFloat(req.query.maxPrice) || Infinity;

            const sortOptions = {};
            if (sortBy) {
                sortOptions[sortBy] = order;
            }

            // Search and filter criteria
            const searchFilter = searchQuery
                ? { productName: { $regex: searchQuery, $options: 'i' } }
                : {};
            
            const filterOptions = {
                ...searchFilter,
                brand: { $in: brandNames.length > 0 ? brandNames : [] },
                category: { $in: categories.length > 0 ? categories : [] },
                price: { $gte: minPrice, $lte: maxPrice },
            };

            // Remove empty filters
            for (const key in filterOptions) {
                if (filterOptions[key] === (key === 'brand' || key === 'category' ? [] : { $lte: Infinity })) {
                    delete filterOptions[key];
                }
            }

            const totalProducts = await productsCollection.countDocuments(filterOptions);
            const totalPages = Math.ceil(totalProducts / limit);

            const products = await productsCollection
                .find(filterOptions)
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
