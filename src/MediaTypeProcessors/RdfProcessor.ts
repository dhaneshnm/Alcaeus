import $rdf from 'rdf-ext'
import { DatasetCore, Stream } from 'rdf-js'
import stringToStream from 'string-to-stream'
import { ParserFactory } from '../ParserFactory'
import { IResponseWrapper } from '../ResponseWrapper'
import * as inferences from './inferences'

export interface IMediaTypeProcessor {
    canProcess(mediaType: string);
    process(
        uri: string,
        response: IResponseWrapper): Promise<Stream>;
}

const parserFactory = new ParserFactory()

function runInferences (dataset: DatasetCore) {
    Object.values(inferences).forEach(inference => inference(dataset))
}

function stripContentTypeParameters (mediaType: string) {
    return mediaType.split(';').shift()
}

async function parseResponse (responseText: string, uri: string, mediaType: string): Promise<Stream> {
    const parsers = parserFactory.create(uri)
    const quadStream = parsers.import(stripContentTypeParameters(mediaType), stringToStream(responseText))
    if (quadStream == null) {
        throw Error(`Parser not found for media type ${mediaType}`)
    }

    const dataset = await $rdf.dataset().import(quadStream)
    runInferences(dataset)

    return dataset.toStream()
}

export default class RdfProcessor implements IMediaTypeProcessor {
    public canProcess (mediaType): boolean {
        return !!parserFactory.create().find(stripContentTypeParameters(mediaType))
    }

    public async process (uri: string, response: IResponseWrapper): Promise<Stream> {
        return parseResponse(await response.xhr.text(), uri, response.mediaType)
    }

    public addParsers (newParsers) {
        Object.entries(newParsers)
            .forEach((pair) => parserFactory.addParser.apply(parserFactory, pair))
    }
}
