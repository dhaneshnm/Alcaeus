# Collections

Hydra specifications defines an interface for collections. A basic collection is represented by an array of
its items (`members`) and the total number of items.

```typescript
interface ICollection {
    /**
     * Gets the total number of items within the entire collection.
     * Note that this number can be larger then the number of `members` in the case of
     * a partial collections
     */
    readonly totalItems: number;
    /**
     * Gets the collection member included in the current representation.
     * In the case of partial collections they may only be a subset of all members
     */
    readonly members: IHydraResource[];
    /**
     * Gets the views of a partial collection
     */
    readonly views?: IView[];
    /**
     * Gets the manages block for current collection
     */
    readonly manages: IManagesBlock[];
}
```

Here's an example of loading a collection which is not paged. In such case the server should respond with a
representation where the `totalItems` property equals `members.length`.

{% runkit %}
const client = require("alcaeus@{{ book.version }}").Hydra;

const rep = await client.loadResource('https://sources.test.wikibus.org/magazine/Buses/issues');

rep.root;
{% endrunkit %}

## Manages block

Hydra introduces the so-called "manages block" which adds additional metadata to collections. It can serve
two purposes:

:one: Inform clients about collection members' relation with another resource

:two: Inform clients about the type of collection elements

In case of member relations, a manages block can look like this (excerpt):

```json
{
  "@id": "https://sources.test.wikibus.org/magazine/Buses/issues",
  "manages": {
    "subject": "https://sources.test.wikibus.org/magazine/Buses",
    "predicate": "dcterms:isPartOf"
  }
}
```

This tells the client that all members of the `/magazine/Buses/issues` collection are in relation with
`/magazine/Buses` defined as

```
?member dcterms:isPartOf </magazine/Buses> .
```

The second case is to declare that all members will be of a certain type:

```json
{
  "@id": "https://sources.test.wikibus.org/magazine/Buses/issues",
  "manages": {
    "predicate": "rdf:type",
    "object": "https://wikibus.org/vocab#MagazineIssue"
  }
}
```

{% hint style="tip" %}
Alcaeus will explicitly add all triples which are implicitly stated about
collection members.
{% endhint %}

Here's an example showing how the manages block is retrieved from a collection to find the `rdf:type`
of collection members. Nothing more than a simple array filter.

{% runkit %}
const { Hydra } = require('alcaeus@0.6.0-beta.1')
const rdfType = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'

const rep = await Hydra.loadResource('https://sources.test.wikibus.org/magazines')

rep.root.manages.find(managesBlock => managesBlock.property.id === rdfType)
{% endrunkit %}

{% hint style="tip" %}
Do see the [`hydra:collection` page](affordances/collection-property.md) for details on discovering
collections based on their manages block specifications.
{% endhint %}

## Paged (partial) collections

It is a common scenario to split a large collections into smaller chunks. Typically called pages, Hydra
uses the term **view** which means to be more generic way of splitting the collection. Currently the only
one actually specified is a `PartialCollectionView`. Alcaeus represents it by implementing the
`IPartialCollectionView`.

```typescript
export interface IPartialCollectionView {
    /**
    * Gets the first page of a collection
    */
    readonly first: IHydraResource;
    /**
    * Gets the previous page of a collection
    */
    readonly previous: IHydraResource;
    /**
    * Gets the next page of a collection
    */
    readonly next: IHydraResource;
    /**
    * Gets the last page of a collection
    */
    readonly last: IHydraResource;
    /**
     * Gets the actual collection resource, of which this view is part of
     */
    readonly collection: HydraResource;
}
```

It is important to notice that requesting a page will actually return the collection object. The view serves
only as metadata for how to retrieve more pages or views but the members will still be "attached" to the
actual collection resource.

{% runkit %}
const client = require("alcaeus@{{ book.version }}").Hydra;

const rep = await client.loadResource('https://sources.test.wikibus.org/magazines?page=2');

rep.root;
{% endrunkit %}

This design has the consequence that it is possible to combine individual view (page) resources by simply
concatenating members of each one. Combining all pages should produce the complete collection.
