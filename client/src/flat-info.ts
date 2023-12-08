export interface FlatInfo {
    name: string;
    image_urls: string[];
    locality: string;
    /** 
     * Price is preformatted like this
     * $2,500,000.00
     * i.e. fullstops is decimal separator
     * and comma is thousands separator
     */
    price: string;
    lat: number;
    lon: number;
}
