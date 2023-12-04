import React, { Reducer, useEffect } from 'react';
import './App.css';
import { List } from './List';
import { FlatInfo } from './flat-info';

declare namespace App {
  interface State {
    list: any[];
    entriesPerPage: number;
    page: number;
  }
  type Action = {
    type: "prev" | "next",
  } | {
    type: "updateList",
    payload: Array<FlatInfo>
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
  }, { list: [], entriesPerPage: 10, page: 1});
  
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
        <button onClick={() => { crawl(); }}>Crawl</button>
        <button onClick={() => { processData(); }}>Process</button>
        <button onClick={() => { refreshList(); }}>Show list 7</button>

        <div>Page: {state.page}</div>

        <List list={state.list}/>

        <div className='Pagination'>
          {state.page > 1 && (<button onClick={() => { dispatch({type: 'prev'}); }}> {'<'} Previous page</button>)}
          <span className='Pag-sep'/>
          <button onClick={() => { dispatch({type: 'next'}); }}>Next page {'>'}</button>
        </div>
      </div>
    </div>
  );
}

export default App;
