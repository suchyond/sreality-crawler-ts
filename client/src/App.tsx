import React, { Reducer, useEffect, useRef } from 'react';
import './App.css';
import { List } from './List';
import { FlatInfo } from './flat-info';
import Button from 'react-bootstrap/Button';
import Pagination from 'react-bootstrap/Pagination';
import Stack from 'react-bootstrap/Stack';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';

declare namespace App {
  interface State {
    list: any[];
    entriesPerPage: number;
    page: number;
    numOfPagesToDownload: number;
  }
  type Action = {
    type: "prev" | "next",
  } | {
    type: "updateList",
    payload: Array<FlatInfo>
  } | {
    type: "crawlNumOfPages",
    payload: number
  }
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
      case "prev": {
        if (state.page > 1) {
          return {
            ...state,
            page: state.page - 1
          };
        }
        break;
      } // case
      case "next": {
        return {
          ...state,
          page: state.page + 1
        };
      } // case
    } //switch
    return state;
  }, { list: [], entriesPerPage: 10, page: 1, numOfPagesToDownload: 1});
  
  const crawl = React.useCallback(() => {
    fetch("/api/crawl", {
      method: "POST"
    }).then((resp) => {
      resp.text().then((response) => {
        console.log("response: ", response);
      })
    });
  }, []);

  const processData = React.useCallback(() => {
    fetch("/api/process", {
      method: "POST"
    }).then((resp) => {
      resp.text().then((response) => {
        console.log("response: ", response);
      })
    });
  }, []);

  useEffect(() => {
    refreshList();
  }, [state.page, state.entriesPerPage]);

  const refreshList = React.useCallback(() => {
    fetch(`/api/list?limit=${state.entriesPerPage}&offset=${((state.page - 1) * state.entriesPerPage)}`).then((resp) => {
      resp.text().then((respTxt) => {
        console.log("response: ", respTxt);

        try {
          const respJson = JSON.parse(respTxt);

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
          console.warn("response: ", respTxt);
        }
        
      })
    });
  }, [state.page, state.entriesPerPage]);

  return (
    <div className="App">
      <div>
        {/*<button onClick={() => { crawl(); }}>Crawl</button>
        <button onClick={() => { processData(); }}>Process</button>
        <button  onClick={() => { refreshList(); }}>Show list 2</button>*/}
        <Stack direction="horizontal" gap={3} className='ActionBtns'>
          <Button variant="primary" onClick={() => { crawl(); }}>{'1)'} Crawl</Button>
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
              <option>60</option>
              <option>120</option>
              <option>240</option>
              <option>480</option>
              <option>540</option>
            </Form.Select>
          </InputGroup>

          <Button variant="secondary" onClick={() => { processData(); }}>{'2)'} Process</Button>
          <Button variant="secondary" onClick={() => { refreshList(); }}>{'3)'} Show list 1</Button>
        </Stack>

        <Pagination className='Pagination'>
          {state.page > 1 && (<Pagination.Prev onClick={() => { dispatch({type: 'prev'}); }}>{'<'} Previous page</Pagination.Prev>)}
          {/*<span className='Pag-sep'/>*/}
          <Pagination.Item active>{state.page}</Pagination.Item>
          <Pagination.Next onClick={() => { dispatch({type: 'next'}); }}>Next page {'>'}</Pagination.Next>
        </Pagination>

        <List list={state.list}/>

      </div>
    </div>
  );
}

export default App;
