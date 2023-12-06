import React, { Reducer, useCallback, useEffect, useRef } from 'react';
import './App.css';
import { List } from './List';
import { FlatInfo } from './flat-info';
import Button from 'react-bootstrap/Button';
import Pagination from 'react-bootstrap/Pagination';
import Stack from 'react-bootstrap/Stack';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import { CrawlStatus, CrawlerTimer } from './crawler-timer';
import { Status, StatusInfo } from './Status';

declare namespace App {
  interface State {
    list: any[];
    entriesPerPage: number;
    displayedPage: number;
    numOfPagesToDownload: number;
    status?: Status;
    crawlStatus?: CrawlStatus;
  }
  type Action = {
    type: "prev" | "next",
  } | {
    type: "updateList",
    payload: Array<FlatInfo>
  } | {
    type: "crawlNumOfPages",
    payload: number
  } | {
    type: "updateStatus",
    payload: Status
  } | {
    type: "updateCrawlStatus",
    payload: CrawlStatus
  };
}

function App() {
  const [state, dispatch] = React.useReducer<Reducer<App.State, App.Action>>((state, action) => {
    switch (action.type) {
      case "updateList": {
        return {
          ...state,
          list: action.payload
        };
      } // case
      case "updateStatus": {
        return {
          ...state,
          status: action.payload
        };
      } // case
      case "crawlNumOfPages": {
        return {
          ...state,
          numOfPagesToDownload: action.payload
        };
      } // case
      case "updateCrawlStatus": {
        return {
          ...state,
          crawlStatus: action.payload
        };
      } // case
      case "prev": {
        if (state.displayedPage > 1) {
          return {
            ...state,
            displayedPage: state.displayedPage - 1
          };
        }
        break;
      } // case
      case "next": {
        return {
          ...state,
          displayedPage: state.displayedPage + 1
        };
      } // case
    } //switch
    return state;
  }, { list: [], entriesPerPage: 10, displayedPage: 1, numOfPagesToDownload: 1 });

  const getStatus = useCallback(() => {
    fetch(`/api/status`).then((resp) => {
      resp.json().then((respJson: Status) => {
        if ( respJson ) {
          dispatch({type: 'updateStatus', payload: respJson});
        }
      });
    });
  }, []);

  useEffect(() => {
    getStatus();
  }, [getStatus]);

  const refreshList = React.useCallback(() => {
    fetch(`/api/list?limit=${state.entriesPerPage}&offset=${
        ((state.displayedPage - 1) * state.entriesPerPage)}`
    ).then((resp) => {
      resp.json().then((respJson) => {
        console.log("response: ", respJson);

        try {
          // validate
          if (Array.isArray(respJson)) {
            if (respJson.length > 0) {
              const flatInfo: FlatInfo = respJson[0];
              if (flatInfo.name && flatInfo.image_url) {
                // Valid
                dispatch({type: "updateList", payload: respJson });
              }
              // TODO: Better validation 
            } else {

            }
          }
          // {name, image_url}
        } catch (e) {
          console.warn("Invalid list response: ", respJson);
        }
        
      }).catch(e => console.warn('Entry listing error', e));
    });
  }, [state.displayedPage, state.entriesPerPage]);

  useEffect(() => {
    refreshList();
  }, [state.displayedPage, state.entriesPerPage, refreshList]);
  
  const processData = React.useCallback(() => {
    //let page = 1; // If no page is used all pages are processed
    fetch(`/api/process`/*?page=${page}`*/, {
      method: "POST"
    }).then((resp) => {
      resp.json().then((respJson: Status) => {
        if ( respJson ) {
          dispatch({type: 'updateStatus', payload: respJson});
          refreshList();
        }
      });
    });
  }, [refreshList]);

  const crawlerRef = useRef({} as {crawler?: CrawlerTimer});

  const crawlAndProcess = useCallback(() => {
    if (!crawlerRef.current.crawler) {
      crawlerRef.current.crawler = new CrawlerTimer({
        waitTimeMs: 2000,
        numOfPagesToDownload: state.numOfPagesToDownload,
        dispatch: (
            action: {type: "updateCrawlStatus", payload: CrawlStatus}
          ) => {
            if (action.payload.crawlingState === 'done') {
              processData();  
            }
            dispatch(action);
          }
      });
    }
    crawlerRef.current.crawler.start(state.numOfPagesToDownload);
  }, [state.numOfPagesToDownload, processData]);

  return (
    <div className="App">
      <div className="UpperBar">
        <Stack direction="horizontal" gap={3} className="ActionBtns" data-bs-theme="dark">
          <Button variant="primary" onClick={() => { crawlAndProcess(); }}>Crawl and process flats</Button>
          <InputGroup className='NumOfEntriesInputGroup'>
            <InputGroup.Text>Number of entries to download:</InputGroup.Text>
            <Form.Select
              defaultValue={'540'}
              className='NumOfEntriesSelect'
              onChange={(evt) => {
                console.log('Form.Select val onChange', evt);
                console.log('Form.Select val onChange', evt && evt.target && evt.target.value);
                const val = evt && evt.target && evt.target.value;

                const numOfEntries = Number(val);
                const numberOfPages = numOfEntries/60;
                dispatch({type: 'crawlNumOfPages', payload: numberOfPages});
              }}
            >
              {[60, 120, 240, 480, 540].map((num) => <option>{num}</option>)}
            </Form.Select>
          </InputGroup>

          <Button variant="outline-secondary" size="sm" onClick={() => { processData(); }}>Process</Button>
          <Button variant="outline-secondary" size="sm" onClick={() => { refreshList(); }}>Refresh list</Button>

          <Pagination className='Pagination'>
            <Pagination.Prev
                disabled={state.displayedPage < 2}
                onClick={() => { dispatch({type: 'prev'}); }}
            >{'<'} Previous page</Pagination.Prev>

            <Pagination.Item active>{state.displayedPage}</Pagination.Item>

            <Pagination.Next
              disabled={!(state.status && state.status.flatCount != null && 
                ((state.displayedPage * state.entriesPerPage)  < state.status.flatCount ))}
              onClick={() => { dispatch({type: 'next'}); }}
            >Next page {'>'}</Pagination.Next>
          </Pagination>
        </Stack>

        <div className='Status'>Status:{<StatusInfo
          status={state.status}
          crawlStatus={state.crawlStatus}
        />}</div>
      </div>

      <div className="List">
        <List list={state.list}/>
      </div>

    </div>
  );
}

export default App;
