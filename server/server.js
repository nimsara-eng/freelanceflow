import express from "express";

const app = express();
const PORT = 5000;

app.use(express.json());

app.get("/api/health", (request, response) => {
  response.status(200).json({
    success: true,
    message: "FreelanceFlow backend is running",
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});