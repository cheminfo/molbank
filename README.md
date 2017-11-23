# molbank

https://www.cheminfo.org/flavor/molbank/

## Requirements
- Node.js >= 6 with npm
- git
- a clone of this repository

After updating the repository, always run `npm install` to make sure dependencies
are up-to-date.

## Generate data files

To generate the data files (molbank-data.json and molbank-data.sdf), call the
`generate` script with the following arguments:
- `directory`: path to the directory containing the XML files
- `out`: path to the directory to write the data files (defaults to "out").

Example:
```shell
node generate --directory=data/xml
```

The script will output error lines to stderr if a molfile is not found or invalid.
This does not prevent the output from being created.

## Publish updated data to GitHub

After generating the data files, follow these steps to publish them to GitHub:

```shell
git add out
git commit -m'update data'
git push
```
