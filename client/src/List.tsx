import { FlatInfo } from "./flat-info";

declare namespace List {
    interface Props {
        list: FlatInfo[]
    }
}

const List: React.FunctionComponent<List.Props> = (
    props: List.Props
) => {

    return <div className="List">
        {/*<div>Number of flats in the database: { props.list.length } </div>*/ /* TODO */}
        { props.list.map((flat) => <div className="Entry">
            <span>{flat.name}</span> <img src={flat.image_url}/>
        </div>) }
        
    </div>;
}

export { List };