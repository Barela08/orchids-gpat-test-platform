import express from 'express';
import cors from 'cors';
import router from '../artifacts/api-server/src/routes/index.js';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  (req as express.Request & { log: { error: (...a: unknown[]) => void; info: (...a: unknown[]) => void } }).log = {
    error: (obj: unknown, msg?: string) => console.error(msg ?? '', obj),
    info: (obj: unknown, msg?: string) => console.log(msg ?? '', obj),
  };
  next();
});

app.use('/api', router);

export default app;
