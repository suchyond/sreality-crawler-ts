import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import { Pool } from "pg";
import fetch from "node-fetch";

const app = express();
dotenv.config({path: '../.env'}); //Reads .env file and makes it accessible via process.env

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

function initializeDbIfNeeded() {
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
          source_page integer,
          price money,
          lat double precision,
          lon double precision,
          image_urls text[],
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
    console.log("DB Initialization error:", err );
  } // try
}

initializeDbIfNeeded();

const statusSqlQuery = `SELECT flats_count, raw_count FROM
(SELECT count(*) AS flats_count FROM flats) AS flats_count,
(SELECT count(*) AS raw_count FROM raw_flat_pages ) AS raw_count;`;

const getStatus = (req: Request, res: Response, next: NextFunction) => {
  pool.query(statusSqlQuery).then((val) => {
    console.log("status:" + JSON.stringify(val.rows) + '\n');

    if (val.rowCount > 0) {
      const rawCount = val.rows[0]['raw_count'];
      const flatCount = val.rows[0]['flats_count'];

      res.send({ flatCount, rawCount });      
    } else {
      res.status(500).send({
        error: 'Cannot get flat and raw data counts'
      });
    }
  }).catch(next);
};

 app.get("/api/list", (req: Request, res: Response, next: NextFunction) => {
  const limit = req.query.limit || 10;
  const offset = req.query.offset || 0;
  pool.query(`SELECT name, locality, price, lat, lon, image_urls FROM flats ORDER BY flats.id LIMIT ${limit} OFFSET ${offset}`).then((val) => {
    console.log(`List flats (limit:${limit} offset:${offset}): rowCount: ${val.rowCount}`);
    res.send(val.rows);
  }).catch(next);
});

function getUrl(page: number) {
  return `https://www.sreality.cz/api/en/v2/estates?category_main_cb=1&category_type_cb=1&page=${page}&per_page=60&tms=1701176375237`;
}

async function crawl(page: number, res: Response) {
  const url = getUrl(page);
  const respCrawl = await fetch(url);
  const respCrawlTxt = await respCrawl.text();
  console.log(`Craw page: ${url}\n`);
  const val = await pool.query('INSERT INTO raw_flat_pages (id,raw_data) VALUES ($1, $2)' +
    ' ON CONFLICT (id) DO UPDATE SET raw_data = $2',
    [page, respCrawlTxt]);
  console.log(`Crawl page: ${page} rowCount:` + val.rowCount + '\n');
}

async function processPage(page: number, res: Response, next: NextFunction) {
  const val = await pool.query(`SELECT id, raw_data FROM raw_flat_pages WHERE id=${page}`);
  console.log(`Processing page: ${page} select rowCount:${val.rowCount}`);
  if (val.rowCount > 0) {
    const rawData = val.rows[0]['raw_data'];

    const listOfPromises: Promise<void>[] = [];
    try {
      const jsonData = JSON.parse(rawData);
      const arrOfEstates = jsonData['_embedded']['estates'];
      arrOfEstates.forEach((estate: {name: string, _links: any,
          gps: {lat: number, lon: number}, locality: string, price: number
      }) => {
        const name = estate['name'];
        const gps = estate['gps'];
        const locality = estate['locality'];
        const price = estate['price'];
        //
        const image_urls_raw = estate['_links']['images'];
        const image_urls: string[] = [];
        if (Array.isArray(image_urls_raw)) {
          image_urls_raw.forEach((image: {href?: string}) => {
            if(image && image.href) {
              image_urls.push(image.href);
            }
          });
        }
        //const image_url = estate['_links']['images'][0]['href'];

        const insertPromise = pool.query('INSERT INTO flats (name, source_page,' +
            ' locality, price, lat, lon, image_urls) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [name, page, locality, price, gps.lat, gps.lon ,image_urls]
        ).then((val) => {
          console.log(`Flat :"${name}" inserted. SrcPage: ${page} Locality: ${
              locality} Price: ${price}\n`);
        }).catch((err) => console.error(`Error while inserting processed flat: ${name}` +
          ` on page: ${page}`, err));

        listOfPromises.push(insertPromise);
      });
    } catch (err) {
      console.error(`Error while processing flat: ${name}`, err);
    }
    await Promise.allSettled(listOfPromises);
  } else {
    next('No pages to process.');
  }
}

/**
 * Gets page number from request query string, 1 is returned when parsing fails
 */
const getPageNumber = (reqQuery: qs.ParsedQs) => {
  let page = 1
  const rawPage = reqQuery.page; // req.query.page;
  if (rawPage && (typeof rawPage === 'string' || rawPage instanceof String)) {
    const parsedPage = parseInt(rawPage as string, 10);
    if (!Number.isNaN(parsedPage) && parsedPage > 0) {
      page = parsedPage;
    }
  }
  return page;
};

app.post("/api/crawl", (req: Request, res: Response, next: NextFunction) => {
  console.log(`Craw request: ${JSON.stringify(req.query)}`);

  const page = getPageNumber(req.query);
  crawl(page, res)
    .then((val) => getStatus(req,res,next))
    .catch(next);
});

const processingAllPagesErr = {
  error: 'Processing all pages: Cannot get flat and raw data counts'
};

app.post("/api/process", (req: Request, res: Response, next: NextFunction) => {
  console.log(`Processing request: ${JSON.stringify(req.body)}`);
  if (req.query.page == null) {
    // Process all pages
    pool.query(statusSqlQuery).then((val) => {
      console.log("Processing all pages... status:" + JSON.stringify(val.rows) + '\n');

      if (val.rowCount < 1) {
        res.status(500).send(processingAllPagesErr);
        return;
      }

      const rawPageCount = parseInt(val.rows[0]['raw_count']);
      if (Number.isNaN(rawPageCount)) {
        res.status(500).send(processingAllPagesErr);
        return;
      }

      if (rawPageCount > 0) {
        let page = 1;
        let promises = [];
        while (page < (rawPageCount + 1)) {
          promises.push(processPage(page, res, next)
            .catch((err) => {
              console.log(`Processing all pages... ERROR page: `+page, err);
            }));
          page++;
        } // while
        // Notify app to cause refresh
        Promise.allSettled(promises)
          .then((val) => getStatus(req,res,next));
      } else {
        res.status(500).send({
          error: 'Processing all pages: No raw pages to process'
        });
      }    
    });

  } else { // Process single page
    const page = getPageNumber(req.query);
    processPage(page, res, next)
      .then((val) => getStatus(req,res,next))
      .catch(next);
  }

});

app.get("/api/status", getStatus);

// DEBUG
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
  res.send("hi 5");
});

// DEBUG
app.get("/test-err", (req: Request, res: Response, next: NextFunction) => {
  throw ( new Error('Test error !'));
});

app.use((err: any, reg: Request, res: Response, next: NextFunction) => {
  // handle error
  res.status(500).send({
    error: err
  });
})

app.listen(process.env.PORT, () => {
  console.log(`Server is running at ${process.env.PORT}`);
});
