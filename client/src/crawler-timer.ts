export interface CrawlStatus {
  crawlingPage?: number;
  crawlingState?: 'done' | 'waiting' | 'downloading';
}

export interface CrawlerConfig {
  waitTimeMs: number;
  numOfPagesToDownload: number;
  dispatch: (action: {
    type: "updateCrawlStatus",
    payload: CrawlStatus
  }) => void;
}

export class CrawlerTimer {
    private page: number;

    public constructor(
        private config: CrawlerConfig
    ) {
      this.page = 1;
    }

    public start(numOfPagesToDownload: number) {
      this.page = 1;
      this.config.numOfPagesToDownload = numOfPagesToDownload;
      this.crawl();
    }

    private crawl = () => {
      this.config.dispatch({
        type: "updateCrawlStatus",
        payload: {crawlingPage: this.page, crawlingState: 'downloading'}
      });
      fetch(`/api/crawl?page=${this.page}`, {
        method: "POST"
      }).then((resp) => {
        console.log("crawl resp.status: ", resp.status);
        // resp.json()
        if (resp.status === 200) {
          resp.text().then((response) => {
            console.log("response: ", response);
            if (this.page < this.config.numOfPagesToDownload) {
              // Get next

              setTimeout(this.nextCrawl, this.config.waitTimeMs);
              this.config.dispatch({
                type: "updateCrawlStatus",
                payload: {crawlingPage: this.page, crawlingState: 'waiting'}
              });
            } else {
              // TODO: Finished
              this.config.dispatch({
                type: "updateCrawlStatus",
                payload: {crawlingPage: this.page, crawlingState: 'done'}
              });
            }
          });
        } else {
          // Not OK status
        }
        
      });
    };

    private nextCrawl = () => {
      this.page++;
      this.crawl();
    }
}
