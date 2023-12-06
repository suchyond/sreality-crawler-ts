import { CrawlStatus } from "./crawler-timer";

/**
 * Current state of the application regarding data in database and 
 * what is back-end currenty doint
 */
export interface Status {
    flatCount: number;
    rawCount: number;
    error?: any;
}


export const StatusInfo = ( props: {
    status?: Status,
    crawlStatus?: CrawlStatus
}) => {
    let statusMsg = '';

    if (props.status) {
      if (props.status.error) {
        statusMsg += 'Error: ' + JSON.stringify(props.status.error);
      } else {
        if (props.status.flatCount != null) {
          statusMsg += ' Processed flats: ' + props.status.flatCount;
        }

        if (props.status.rawCount != null) {
          statusMsg += ' Downloaded pages: ' + props.status.rawCount;
        }
      }

      if (props.crawlStatus && props.crawlStatus.crawlingPage) {
        statusMsg += ' Crawling page: ' + props.crawlStatus.crawlingPage;
      }

      if (props.crawlStatus && props.crawlStatus.crawlingState) {
        statusMsg += ' Crawling state: ' + props.crawlStatus.crawlingState;
      }
    }
    return <span className='StatusInfo'>{ statusMsg }</span>;
};
