import { app } from "./app";
import { getEnv } from "./config/env";

const env = getEnv();

app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});
