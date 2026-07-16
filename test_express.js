const express = require("express");
const app = express();
const router = express.Router();

router.get("/:id", (req, res) => res.json({ hit: "id" }));
router.get("/:id/submissions", (req, res) => res.json({ hit: "submissions" }));

app.use("/missions", router);

const request = require("supertest");
request(app).get("/missions/m_123/submissions").end((err, res) => {
  console.log(res.body);
});
