import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import { Pool } from "pg";
import fetch from "node-fetch";
//import path from "path";

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
  pool.query(`SELECT name, image_url FROM flats ORDER BY flats.id LIMIT ${limit} OFFSET ${offset}`).then((val) => {
    console.log("rowCoung:" + val.rowCount + '\n')
    res.send(val.rows);
  }).catch(next);
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
      pool.query('INSERT INTO raw_flat_pages (id,raw_data) VALUES ($1, $2)'+
          ' ON CONFLICT (id) DO UPDATE SET raw_data = $2',
          [page, respCrawlTxt]).then((val) => {
        console.log("rowCoung:" + val.rowCount + '\n');
        // res.send(JSON.stringify(val.rows));
      });
    })
  });
  /*https.get(url, (res) => {
    res.
  });*/
}

function processPage(page: number, res: Response, next: NextFunction) {
  return new Promise((resolve, reject) => {
    pool.query(`SELECT id, raw_data FROM raw_flat_pages WHERE id=${page}`).then((val) => {
      console.log("rowCoung:" + val.rowCount + '\n');
      if (val.rowCount > 0) {
        const rawData = val.rows[0]['raw_data'];

        const listOfPromises: Promise<void>[] = [];
        try {
          const jsonData = JSON.parse(rawData);
          const arrOfEstates = jsonData['_embedded']['estates'];
          arrOfEstates.forEach((estate: {name: string, _links: any}) => {
            const name = estate['name'];
            const image_url = estate['_links']['images'][0]['href'];

            const insertPromise = pool.query(
              'INSERT INTO flats (name, image_url) VALUES ($1, $2)',
              [name, image_url]
            ).then((val) => {
              console.log('flat :' + name + 'inserted.' + val + '\n');
            });
            listOfPromises.push(insertPromise);
          });
        } catch (err) {
          console.log(err);
        }
        Promise.allSettled(listOfPromises).then((val) => resolve(val))
      } else {
        reject('No pages to process ');
      }
    // res.send(JSON.stringify(val.rows));
    }).catch(next);
  });
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
  crawl(page, res);
  res.send("crawl");
});

const processingAllPagesErr = {
  error: 'Processing all pages: Cannot get flat and raw data counts'
};

app.post("/api/process", (req: Request, res: Response, next: NextFunction) => {
  console.log(`Craw request: ${JSON.stringify(req.body)}`);
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
        while (page < rawPageCount) {
          promises.push(processPage(page, res, next)
            .catch((err) => {
              console.log(`Processing all pages... ERROR page: `+page, err);
            }));
          page++;
        } // while
        // Nofify app to cause refresh
        Promise.allSettled(promises).then((val) => getStatus(req,res,next))
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
