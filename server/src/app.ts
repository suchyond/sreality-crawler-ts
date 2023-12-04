import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import { Pool } from "pg";
import fetch from "node-fetch";
//import path from "path";

const app = express();
dotenv.config(); //Reads .env file and makes it accessible via process.env

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(/*"5433"/*/process.env.DB_PORT || "5432")
});



const connectToDB = async () => {
  try {
    await pool.connect();
  } catch (err) {
    console.log(err);
  }
};

connectToDB();

/*app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
 });*/

 app.use(express.static("../client/build"));

let serverState = { dbInitialized: false };

function testDb() {
  try {
    pool.query(`SELECT EXISTS (
      SELECT FROM 
          pg_tables
      WHERE 
          schemaname = 'public' AND 
          tablename  = 'flats'
      );`).then((val) => {
      console.log("DB Test: " +JSON.stringify(val.rows)+ "\n")
      if (val.rowCount> 0 && val.rows[0].exists) {
        console.log("DB Test OK:\n");
        serverState.dbInitialized = true;
      } else {
        pool.query(`
        CREATE TABLE public.flats (
          id SERIAL PRIMARY KEY,
          name text,
          image_url text
        );
        CREATE TABLE public.raw_flat_pages (
          id integer PRIMARY KEY,
          raw_data text
        );
      `).then((val) => {
        console.log("DB Initialized.\n")
        serverState.dbInitialized = true;
      });
      }
      
    });
  } catch (err) {
    console.log("DB Initialization error:" + err + '\n');
  } // try
}

testDb();

 app.get("/api/list", (req: Request, res: Response, next: NextFunction) => {
  const limit = req.query.limit || 10;
  const offset = req.query.offset || 0;
  pool.query(`SELECT name, image_url FROM flats ORDER BY flats.id LIMIT ${limit} OFFSET ${offset}`).then((val) => {
    console.log("rowCoung:" + val.rowCount + '\n')
    res.send(JSON.stringify(val.rows));
  });
});

function getUrl(page: number) {
  return `https://www.sreality.cz/api/en/v2/estates?category_main_cb=1&category_type_cb=1&page=${page}&per_page=60&tms=1701176375237`;
}

function crawl(page: number, res: Response) {
  const url = getUrl(page);
  fetch(url).then((respCrawl) => {
    respCrawl.text().then((respCrawlTxt) => {
      console.log(`Craw page: ${url}\n`);
      console.log(`Craw data: ${respCrawlTxt}\n`);
      pool.query('INSERT INTO raw_flat_pages (id,raw_data) VALUES ($1, $2)', [page, respCrawlTxt]).then((val) => {
        console.log("rowCoung:" + val.rowCount + '\n');
        // res.send(JSON.stringify(val.rows));
      });
    })
  });
  /*https.get(url, (res) => {
    res.
  });*/
}

function processPage(page: number, res: Response) {
  pool.query(`SELECT id, raw_data FROM raw_flat_pages WHERE id=${page}`).then((val) => {
    console.log("rowCoung:" + val.rowCount + '\n');
    if (val.rowCount > 0) {
      const rawData = val.rows[0]['raw_data'];

      try {
        const jsonData = JSON.parse(rawData);
        const arrOfEstates = jsonData['_embedded']['estates'];
        arrOfEstates.forEach((estate: {name: string, _links: any}) => {
          const name = estate['name'];
          const image_url = estate['_links']['images'][0]['href'];

          pool.query('INSERT INTO flats (name, image_url) VALUES ($1, $2)', [name, image_url]).then((val) => {
            console.log('flat :' + name + 'inserted.' + val + '\n');
          });
        });
      } catch (err) {
        console.log(err);
      }
      
      rawData
    }
    // res.send(JSON.stringify(val.rows));
  });
}

app.post("/api/crawl", (req: Request, res: Response, next: NextFunction) => {
  console.log(`Craw request: ${req.body}`);
  crawl(1, res);
  res.send("crawl");
});

app.post("/api/process", (req: Request, res: Response, next: NextFunction) => {
  console.log(`Craw request: ${req.body}`);
  processPage(1, res);
  res.send("crawl");
});

app.get("/test", (req: Request, res: Response, next: NextFunction) => {
  res.send("hi 6");
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running at ${process.env.PORT}`);
});
