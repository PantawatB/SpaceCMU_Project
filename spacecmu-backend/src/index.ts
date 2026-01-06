import "dotenv/config";
import app from "./app.js";
import Debug from "debug";

const debug = Debug("pf-backend");
const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  debug(`Listening on port ${PORT}: http://localhost:${PORT}`);
  console.log(`Server is running at http://localhost:${PORT}`);
});