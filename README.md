# CAP SEGW

This is a custom SAP CAP Plugin that generates ABAP code for SEGW Model Provider Class (MPC) and Data Provider Class (DPC) definitions.
It provides a bridge between modern CAP services and legacy SAP Gateway (OData V2) and (OData V4) environments, enabling interoperability with existing ABAP systems.

Many enterprise systems still rely on SAP NetWeaver Gateway (SEGW) projects to expose OData V2 services.
This plugin allows developers to design and maintain their data models in CAP CDS while automatically generating the corresponding ABAP classes needed to integrate with older systems.

## Features

- Supports entity sets, associations, and annotations from CAP definitions.
- Seamlessly integrates into the CAP build pipeline (cds build --for segw).
- Allows custom annotations to control ABAP output generation.
- Extensible design for future SEGW enhancements and ABAP compatibility layers.

## Annotations

Since there are some annotations that are not present in CDS but can be set on SEGW, we added some annotations.


|        Annotation       |            Description        |     Type     |
|-------------------------|-------------------------------|--------------|
| `@segw.name`            | Set the name of the component |   `string`   |
| `@segw.sortable`        | Enable Sortable               |   `boolean`  |
| `@segw.filterable`      | Enabled Filterable            |   `boolean`  |
| `@segw.conversion`      | ABAP Field Conversions        |   `boolean`  |
| `@segw.pageable`        | Pagination                    |   `boolean`  |
| `@segw.addressable`	  | Addressable                   |   `boolean`  |
| `@segw.ftxt_search`     | Filter Text Search            |   `boolean`  |
| `@segw.subscribable`    | Allows to be subscribable     |   `boolean`  |
| `@segw.filter_required` | Filtered is required          |   `boolean`  |
| `@segw.abap.name`       | ABAP Field Name Override      |   `string`   |
| `@segw.abap.type`       | ABAP DDIC Type                |   `string`   |
| `@segw.mpc.define.name` | MPC Define Entity Method Name |   `string`   |


## Installation
```
npm install @root3287/cap-segw
```

Register the plugin in your CAP project:
```
// in cds-plugin.js
module.exports = require("@root3287/cap-segw");
```

## Usage

```
cds compile srv -s all --to segw
```

1. Define your entities and services in CAP CDS as usual.
2. Annotate your services or entities using your custom SEGW annotations (if required).
3. Run `cds compile --to segw` to generate ABAP classes.
4. Copy or deploy the generated .abap files into your ABAP system for SEGW integration.

By default this will generate an ODataV4 classes.
To switch to ODataV2 run with `--odata-version 2` parameter.

## Development

```
git clone https://github.com/Root3287/cap-segw.git
cd cap-segw
npm install 
npm run build
```

### Local Testing

```
# install globally
npm link

# install locally
cd /path/to/your-cap-project
npm link cap-segw
```

### In-Repository Tests

```
export PATH=$(pwd)/node_modules/.bin
mkdir node_modules/@root3287 && ln -s . node_modules/@root3287/cap-segw
```

## License

This project is licensed under the Apache 2.0 License.
See the [LICENSE](LICENSE)

