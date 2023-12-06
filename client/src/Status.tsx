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
    let errorMsg: JSX.Element | null = null;

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
    }

    if (props.crawlStatus) {
      if (props.crawlStatus.crawlingPage) {
        statusMsg += ' Crawling page: ' + props.crawlStatus.crawlingPage;
      }

      if (props.crawlStatus.crawlingState) {
        statusMsg += ' Crawling state: ' + props.crawlStatus.crawlingState;
      }

      if (props.crawlStatus.errors) {
        errorMsg = <> Crawling errors page #: {
            props.crawlStatus.errors.map((err, idx) => <span
                key={err.page+'-'+idx}
                title={JSON.stringify(err.err)}
            >{err.page}</span>) 
        }</>;
      }
    }
    return <span className='StatusInfo'>{ statusMsg }{ errorMsg }</span>;
};
