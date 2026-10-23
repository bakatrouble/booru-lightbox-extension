import ky from 'ky';

const parser = new DOMParser();

export const fetchDocument = async (url: string) => {
    return parser.parseFromString(await ky.get(url).text(), 'text/html');
};
