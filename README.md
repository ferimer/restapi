# REST API

## Server

## Client

## Sever mock

## Client mock

## Validator

## The RDF format

RDF stands for **R**EST **D**efinition **F**ormat. It is a json describing the API with the following keys.

### `rdf`

Is the version of the RDF file.

### `name`

The human readable name for the API.

### `authors`

A list of the authors of this API.

### `version`

Version of the API.

### `description`

A human readable description to summarize the capabilities of the API.

### `endpoint`

Information about the point of entry for the API. It is an object with these keys:

  * `basePath`: path where the API resides.
  * `versions`: list of strings representing versions. The version is concatenated to the `basePath` value to resolve in the point of entry from which all resources can be found.

Suppose you have the resource collection `"cars"` and an `endpoint` entry as follows:

```javascript
{
  "basePath": "awesome",
  "versions": ["v1"]
}
```

Then the resource collection `"cars"` will be available through `awesome/v1/cars`.

### `common`

Configures common aspects of the answers provided by the server. In particular:

### `cors`

Specify the `cors` headers that must to be included in the response. Can be overriden by resource.

### `responses`

Specify the data returned in the body in case of error. The value of `responses` is a map with response codes as string keys and value describing the body. For instance:

```javascript
{
  "404": { "data": { "error": "Resource not found } }"
}
```

Will return a json body with the serialization of the `data` field.

### `resources`

Here is where your resources resides. They are organised in the same versions you declared in the field `versions` of the [`endpoint`](#endpoint) entry.

```javascript
{
  "v1": { /*...*/ }
}
```

Each version is a map with endpoints as keys and endpoint descriptors as values. For instance:

```javascript
{
  "v1": {
    "cars": { /*...*/ }
    "cars/:carId": { /*...*/ }
  }
}
```

An endpoint is a string describing an URL and can contain placeholders for variable parts that will be gathered as parameters inside the framework. A placeholder is a fragment of the url in the form of `:<name>`. When converted to a parameter it is always interpreted as a string.

#### Endpoint descriptors

An endpoint descriptor is mainly an object describing the methods that can be performed onto the endpoint.

##### `description`

Provide a description of the resource represented by the endpoint.

##### `cors`

Define the CORS headers that can be included along with the response. Overrides those defined in the [`common`](#common) entry.

##### `methods`

Define which methods can be performed on the endpoint. It is a map with the http verbs as keys and method descriptor as values. For instance:

```javascript
"cars": {
  "options": {},
  "get": {
    "description": "Get the collection of all cars"
  }
}
```

Notice you will need the empty method descriptor `{}` to allow the method to be performed on the endpoint even if you don't provide any field.

#### Method descriptors

A method descriptor describes the consequences of performing an action on an endpoint. It declares the parameters required in the request for the request to be valid.

##### `description`

Describe the consequences of the operation in a human readable format.

##### `params`

Describe the expected parameters for this request to be valid. It is a map of parameter names as keys and types as values. For instance:

```javascript
{
  "licensePlate": "string",
  "picture": "file"
}
```
