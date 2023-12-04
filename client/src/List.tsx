import { FlatInfo } from "./flat-info";
import Table from 'react-bootstrap/Table';

declare namespace List {
    interface Props {
        list: FlatInfo[]
    }
}

const List: React.FunctionComponent<List.Props> = (
    props: List.Props
) => {

    return <Table striped bordered hover variant="dark">
      <thead>
        <tr>
          <th>Title</th>
          <th>Image</th>
        </tr>
      </thead>
      <tbody>
       { props.list.map((flat) => <tr>
            <td>{flat.name}</td>
            <td><img src={flat.image_url} alt={flat.image_url}/></td>
        </tr>)}
     </tbody>
    </Table>;

{/*     return <div className="List">
        {/*<div>Number of flats in the database: { props.list.length } </div>*/ /* TODO *//*}
        { props.list.map((flat) => <div className="Entry">
            <span>{flat.name}</span> <img src={flat.image_url}/>
    </div>) } 
        
    </div>;*/}
}

export { List };