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
       { props.list.map((flat) => <tr key={flat.name+flat.image_url}>
            <td>{flat.name}</td>
            <td><img src={flat.image_url} alt={flat.image_url}/></td>
        </tr>)}
     </tbody>
    </Table>;
}

export { List };