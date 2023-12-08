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
       { props.list.map((flat) => {
        const url = flat.image_urls && flat.image_urls[0];

        let formattedPrice = flat.price
          .replaceAll(',', ' ')
          .replace('.', ',')
          .replace('$', 'CZK ');
        return(
          <tr key={flat.name + url}>
            <td>
              <div>{flat.name}</div>
              <div>{flat.locality}</div>
              <div>{formattedPrice}</div>
            </td>
            <td><img src={url} alt={url}/></td>
          </tr>);
        })}
     </tbody>
    </Table>;
}

export { List };