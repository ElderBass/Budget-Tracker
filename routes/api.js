const router = require("express").Router();
const Transaction = require("../models/transaction.js");

router.post("/api/transaction", ({body}, res) => {
  console.log("post for single transaction body = ", body)
  Transaction.create(body)
    .then(dbTransaction => {
      console.log("api POST transaction = ", dbTransaction)
      res.json(dbTransaction);
    })
    .catch(err => {
      res.status(404).json(err);
    });
});

router.post("/api/transaction/bulk", ({body}, res) => {
  console.log("body in bulk post route = ", body);
  Transaction.insertMany(body)
    .then(dbTransaction => {
      console.log("bulk transaction = ", dbTransaction)
      res.json(dbTransaction);
    })
    .catch(err => {
      res.status(404).json(err);
    });
});

router.get("/api/transaction", (req, res) => {
  Transaction.find({}).sort({date: -1})
    .then(dbTransaction => {
      console.log("GET dbTransaction = ", dbTransaction)
      res.json(dbTransaction);
    })
    .catch(err => {
      res.status(404).json(err);
    });
});

module.exports = router;